import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  addPantryItem,
  deletePantryItem,
  getNutritionFoodLookupProvider,
  listPantryItems,
  nutritionPantryKeys,
  updatePantryItem,
  type PantryUnit,
} from '@/lib/api/nutrition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import type { FoodTemplate } from '@/types/nutrition';

export function AtletaNutritionPantryPage({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [foodQuery, setFoodQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodTemplate | null>(null);
  const [customName, setCustomName] = useState('');
  const [quantity, setQuantity] = useState('500');
  const [unit, setUnit] = useState<PantryUnit>('g');
  const [expiresOn, setExpiresOn] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: nutritionPantryKeys.list(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: () => listPantryItems(user!.id),
  });

  const { data: foods = [] } = useQuery({
    queryKey: ['pantry-food-search', foodQuery],
    queryFn: () => getNutritionFoodLookupProvider().searchByText(foodQuery),
    enabled: open,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: nutritionPantryKeys.list(user!.id) });

  const addMutation = useMutation({
    mutationFn: async () => {
      const q = Number(quantity);
      if (!q || q < 0) throw new Error('Quantità non valida');
      const name = selectedFood?.name ?? customName.trim();
      if (!name) throw new Error('Scegli o inserisci un alimento');
      return addPantryItem({
        atletaUserId: user!.id,
        foodTemplateId: selectedFood?.id ?? null,
        customName: selectedFood ? selectedFood.name : customName.trim(),
        quantity: q,
        unit,
        expiresOn: expiresOn.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success('Aggiunto in dispensa');
      setOpen(false);
      setSelectedFood(null);
      setCustomName('');
      setExpiresOn('');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePantryItem,
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const updateQtyMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      updatePantryItem(id, { quantity }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const unitLabel = (u: PantryUnit) => (u === 'pz' ? 'pezzi' : u);

  return (
    <div className={embedded ? 'space-y-4' : 'p-4 space-y-4'}>
      {!embedded && (
        <div>
          <h2 className="text-lg font-bold text-app-foreground">Dispensa</h2>
          <p className="text-sm text-app-muted-foreground">Cosa hai in casa — senza scarico automatico dal diario</p>
        </div>
      )}

      <Button className="w-full bg-app-accent text-app-accent-foreground" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Aggiungi in dispensa
      </Button>

      {isLoading ? (
        <p className="text-sm text-center text-app-muted-foreground py-6">Caricamento…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-app-muted-foreground rounded-xl border border-dashed border-app-border p-6 text-center">
          La dispensa è vuota. Aggiungi gli alimenti che tieni di solito in frigo e dispensa.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-xl border border-app-border bg-app-card px-3 py-2 text-sm"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.custom_name ?? 'Alimento'}</p>
                <div className="flex items-center gap-2 text-xs text-app-muted-foreground">
                  <Input
                    type="number"
                    className="h-7 w-20 text-xs"
                    defaultValue={item.quantity}
                    onBlur={(e) => {
                      const q = Number(e.target.value);
                      if (q >= 0 && q !== Number(item.quantity)) {
                        updateQtyMutation.mutate({ id: item.id, quantity: q });
                      }
                    }}
                  />
                  <span>{unitLabel(item.unit as PantryUnit)}</span>
                  {item.expires_on ? <span>· scad. {item.expires_on}</span> : null}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive shrink-0"
                onClick={() => deleteMutation.mutate(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo elemento dispensa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Cerca alimento</Label>
              <Input value={foodQuery} onChange={(e) => setFoodQuery(e.target.value)} />
              <ul className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1">
                {foods.slice(0, 12).map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      className={`w-full text-left text-sm px-2 py-1 rounded ${selectedFood?.id === f.id ? 'bg-app-accent/20' : ''}`}
                      onClick={() => {
                        setSelectedFood(f);
                        setCustomName('');
                      }}
                    >
                      {f.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            {!selectedFood && (
              <div className="space-y-2">
                <Label>Nome libero</Label>
                <Input value={customName} onChange={(e) => setCustomName(e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Scadenza (opzionale)</Label>
              <Input type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Quantità</Label>
                <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Unità</Label>
                <Select value={unit} onValueChange={(v) => setUnit(v as PantryUnit)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g">grammi</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="pz">pezzi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
            <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AtletaNutritionPantryPage;
