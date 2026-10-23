import { useState } from 'react';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { addDiaryEntryFromRecipe, nutritionDiaryKeys } from '@/lib/api/nutrition';
import type { NutritionMealType, NutritionTemplateRecipe } from '@/types/nutrition';
import { NUTRITION_MEAL_LABELS } from '@/types/nutrition';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

const MEAL_BY_CATEGORY: Partial<Record<string, NutritionMealType>> = {
  colazione: 'colazione',
  spuntino: 'spuntino_mattina',
  pranzo: 'pranzo',
  cena: 'cena',
  post_allenamento: 'spuntino_sera',
  vegetariano: 'pranzo',
  veloce: 'pranzo',
};

export function AddRecipeToDiaryDialog({ recipe }: { recipe: NutritionTemplateRecipe }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mealType, setMealType] = useState<NutritionMealType>(
    MEAL_BY_CATEGORY[recipe.category] ?? 'pranzo',
  );
  const [servings, setServings] = useState('1');
  const day = format(new Date(), 'yyyy-MM-dd');

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Sessione non valida');
      const s = Number(servings);
      if (!s || s <= 0) throw new Error('Porzioni non valide');
      return addDiaryEntryFromRecipe(user.id, day, mealType, recipe, s);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nutritionDiaryKeys.day(user!.id, day) });
      toast.success('Ricetta aggiunta al diario di oggi');
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-app-accent text-app-accent-foreground">
          <Plus className="mr-2 h-4 w-4" />
          Aggiungi al diario di oggi
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registra nel diario</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-app-muted-foreground">
            {recipe.name} — {recipe.per_serving_kcal} kcal per porzione
          </p>
          <div className="space-y-2">
            <Label>Pasto</Label>
            <Select value={mealType} onValueChange={(v) => setMealType(v as NutritionMealType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(NUTRITION_MEAL_LABELS) as NutritionMealType[]).map((k) => (
                  <SelectItem key={k} value={k}>{NUTRITION_MEAL_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Porzioni</Label>
            <Input type="number" step="0.25" min="0.25" value={servings} onChange={(e) => setServings(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
