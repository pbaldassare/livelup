import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';
import { useAuth } from '@/hooks/useAuth';
import {
  createPtCustomFood,
  deletePtCustomFood,
  listPtCustomFoods,
  nutritionPtFoodKeys,
} from '@/lib/api/nutrition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

export function PTAppNutritionFoodsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [p, setP] = useState('');
  const [c, setC] = useState('');
  const [f, setF] = useState('');

  const { data: foods = [], isLoading } = useQuery({
    queryKey: nutritionPtFoodKeys.list(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: () => listPtCustomFoods(user!.id),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Sessione non valida');
      if (!name.trim()) throw new Error('Nome obbligatorio');
      return createPtCustomFood({
        ptUserId: user.id,
        name,
        per100gKcal: Number(kcal) || 0,
        proteinG: Number(p) || 0,
        carbsG: Number(c) || 0,
        fatG: Number(f) || 0,
      });
    },
    onSuccess: () => {
      toast.success('Alimento creato');
      setName('');
      setKcal('');
      setP('');
      setC('');
      setF('');
      queryClient.invalidateQueries({ queryKey: nutritionPtFoodKeys.list(user!.id) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePtCustomFood,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nutritionPtFoodKeys.list(user!.id) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PTAppPageShell
      title="I miei alimenti"
      description="Valori per 100 g — visibili ai tuoi atleti collegati in ricerca"
      showBack
      backTo="/pt/app/nutrition"
    >
      <div className="space-y-4 rounded-2xl border border-app-border bg-app-card p-4 mb-6">
        <p className="text-sm font-medium">Nuovo alimento</p>
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>kcal/100g</Label>
            <Input type="number" value={kcal} onChange={(e) => setKcal(e.target.value)} />
          </div>
          <div>
            <Label>Proteine</Label>
            <Input type="number" value={p} onChange={(e) => setP(e.target.value)} />
          </div>
          <div>
            <Label>Carboidrati</Label>
            <Input type="number" value={c} onChange={(e) => setC(e.target.value)} />
          </div>
          <div>
            <Label>Grassi</Label>
            <Input type="number" value={f} onChange={(e) => setF(e.target.value)} />
          </div>
        </div>
        <Button
          className="w-full bg-pt-primary text-pt-primary-foreground"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
        >
          Salva alimento
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-center text-app-muted-foreground">Caricamento…</p>
      ) : foods.length === 0 ? (
        <p className="text-sm text-app-muted-foreground">Nessun alimento personalizzato.</p>
      ) : (
        <ul className="space-y-2">
          {foods.map((food) => (
            <li
              key={food.id}
              className="flex items-center gap-2 rounded-xl border border-app-border bg-app-card px-3 py-2 text-sm"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{food.name}</p>
                <p className="text-xs text-app-muted-foreground">
                  {food.per_100g_kcal} kcal · P {food.per_100g_protein_g}g
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={() => deleteMutation.mutate(food.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </PTAppPageShell>
  );
}

export default PTAppNutritionFoodsPage;
