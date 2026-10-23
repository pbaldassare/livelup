import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Salad, Trash2, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  addDiaryEntry,
  deleteDiaryEntry,
  getActiveNutritionPlan,
  listDiaryEntries,
  nutritionDiaryKeys,
  nutritionPlanKeys,
  searchFoodTemplates,
} from '@/lib/api/nutrition';
import { macrosForGrams, sumMacroTotals } from '@/lib/nutritionMacros';
import { MacroSummaryBar } from '@/components/nutrition/MacroSummaryBar';
import {
  NUTRITION_MEAL_LABELS,
  type NutritionMealType,
  type FoodTemplate,
} from '@/types/nutrition';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

function todayIso(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function AtletaNutritionPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [day, setDay] = useState(todayIso());
  const [addOpen, setAddOpen] = useState(false);
  const [mealType, setMealType] = useState<NutritionMealType>('pranzo');
  const [foodQuery, setFoodQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodTemplate | null>(null);
  const [grams, setGrams] = useState('100');
  const [customName, setCustomName] = useState('');

  const { data: plan } = useQuery({
    queryKey: nutritionPlanKeys.activeForAtleta(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: () => getActiveNutritionPlan(user!.id),
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: nutritionDiaryKeys.day(user?.id ?? '', day),
    enabled: !!user?.id,
    queryFn: () => listDiaryEntries(user!.id, day),
  });

  const { data: foods = [] } = useQuery({
    queryKey: ['food-search', foodQuery],
    queryFn: () => searchFoodTemplates(foodQuery),
    enabled: addOpen,
  });

  const totals = useMemo(
    () =>
      sumMacroTotals(
        entries.map((e) => ({
          kcal: Number(e.kcal),
          protein_g: Number(e.protein_g),
          carbs_g: Number(e.carbs_g),
          fat_g: Number(e.fat_g),
        })),
      ),
    [entries],
  );

  const target = plan
    ? {
        kcal: plan.daily_kcal,
        protein_g: plan.protein_g,
        carbs_g: plan.carbs_g,
        fat_g: plan.fat_g,
      }
    : { kcal: 2000, protein_g: 120, carbs_g: 200, fat_g: 65 };

  const shiftDay = (delta: number) => {
    const d = new Date(day + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    setDay(format(d, 'yyyy-MM-dd'));
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const g = Number(grams);
      if (!g || g <= 0) throw new Error('Inserisci una grammatura valida');
      let macros;
      let foodId: string | null = null;
      let name: string | null = null;
      if (selectedFood) {
        macros = macrosForGrams(selectedFood, g);
        foodId = selectedFood.id;
        name = selectedFood.name;
      } else {
        const label = customName.trim();
        if (!label) throw new Error('Scegli un alimento o inserisci un nome');
        name = label;
        macros = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
      }
      return addDiaryEntry({
        atletaUserId: user!.id,
        loggedOn: day,
        mealType,
        foodTemplateId: foodId,
        customName: name,
        grams: g,
        macros,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nutritionDiaryKeys.day(user!.id, day) });
      setAddOpen(false);
      setSelectedFood(null);
      setCustomName('');
      setGrams('100');
      toast.success('Pasto registrato');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDiaryEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nutritionDiaryKeys.day(user!.id, day) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const grouped = useMemo(() => {
    const map = new Map<NutritionMealType, typeof entries>();
    for (const key of Object.keys(NUTRITION_MEAL_LABELS) as NutritionMealType[]) {
      map.set(key, []);
    }
    for (const e of entries) {
      map.get(e.meal_type as NutritionMealType)?.push(e);
    }
    return map;
  }, [entries]);

  return (
    <div className="min-h-screen bg-app-background pb-20">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Salad className="h-7 w-7 text-app-accent" />
          <div>
            <h1 className="text-xl font-bold text-app-foreground">Nutrizione</h1>
            <p className="text-sm text-app-muted-foreground">Diario alimentare e obiettivi</p>
          </div>
        </div>

        {plan ? (
          <div className="rounded-2xl border border-app-border bg-app-card p-4">
            <p className="font-medium text-app-foreground">{plan.title}</p>
            {plan.notes && (
              <p className="text-sm text-app-muted-foreground mt-1 whitespace-pre-wrap">{plan.notes}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-app-muted-foreground rounded-xl border border-dashed border-app-border p-4">
            Il tuo Professionista non ha ancora attivato un piano. Puoi comunque tenere il diario.
          </p>
        )}

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => shiftDay(-1)} aria-label="Giorno precedente">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <p className="text-sm font-medium capitalize">
            {format(new Date(day + 'T12:00:00'), 'EEEE d MMMM', { locale: it })}
          </p>
          <Button variant="ghost" size="icon" onClick={() => shiftDay(1)} aria-label="Giorno successivo">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <MacroSummaryBar actual={totals} target={target} />

        <Button className="w-full bg-app-accent text-app-accent-foreground" onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Aggiungi alimento
        </Button>

        {isLoading ? (
          <p className="text-sm text-center text-app-muted-foreground py-6">Caricamento…</p>
        ) : (
          <div className="space-y-4">
            {(Object.keys(NUTRITION_MEAL_LABELS) as NutritionMealType[]).map((meal) => {
              const list = grouped.get(meal) ?? [];
              if (list.length === 0) return null;
              return (
                <div key={meal}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-app-muted-foreground mb-2">
                    {NUTRITION_MEAL_LABELS[meal]}
                  </p>
                  <ul className="space-y-2">
                    {list.map((e) => (
                      <li
                        key={e.id}
                        className="flex items-center gap-2 rounded-xl border border-app-border bg-app-card px-3 py-2 text-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{e.custom_name ?? 'Alimento'}</p>
                          <p className="text-xs text-app-muted-foreground">
                            {e.grams}g · {Math.round(Number(e.kcal))} kcal
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-destructive"
                          onClick={() => deleteMutation.mutate(e.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aggiungi alimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
              <Label>Cerca alimento</Label>
              <Input value={foodQuery} onChange={(e) => setFoodQuery(e.target.value)} placeholder="Es. pollo, riso…" />
              <ul className="max-h-40 overflow-y-auto space-y-1 border rounded-lg p-2">
                {foods.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      className={`w-full text-left text-sm rounded px-2 py-1.5 ${
                        selectedFood?.id === f.id ? 'bg-app-accent/20' : 'hover:bg-app-muted/50'
                      }`}
                      onClick={() => {
                        setSelectedFood(f);
                        setCustomName('');
                      }}
                    >
                      {f.name}
                      <span className="text-app-muted-foreground"> · {f.per_100g_kcal} kcal/100g</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            {!selectedFood && (
              <div className="space-y-2">
                <Label>Oppure nome libero</Label>
                <Input value={customName} onChange={(e) => setCustomName(e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Grammi</Label>
              <Input type="number" value={grams} onChange={(e) => setGrams(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Annulla</Button>
            <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending}>
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AtletaNutritionPage;
