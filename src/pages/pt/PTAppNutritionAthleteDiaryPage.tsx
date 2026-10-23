import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';
import {
  getActiveNutritionPlan,
  listDiaryEntries,
  listPantryItems,
  listRecentDiaryDays,
  nutritionDiaryKeys,
  nutritionPantryKeys,
  nutritionPlanKeys,
} from '@/lib/api/nutrition';
import { sumMacroTotals } from '@/lib/nutritionMacros';
import { MacroSummaryBar } from '@/components/nutrition/MacroSummaryBar';
import { NUTRITION_MEAL_LABELS, type NutritionMealType } from '@/types/nutrition';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function PTAppNutritionAthleteDiaryPage() {
  const { atletaUserId = '' } = useParams();
  const [day, setDay] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const { data: plan } = useQuery({
    queryKey: nutritionPlanKeys.activeForAtleta(atletaUserId),
    enabled: !!atletaUserId,
    queryFn: () => getActiveNutritionPlan(atletaUserId),
  });

  const { data: recentDays = [] } = useQuery({
    queryKey: ['nutrition-diary-recent', atletaUserId],
    enabled: !!atletaUserId,
    queryFn: () => listRecentDiaryDays(atletaUserId),
  });

  const { data: pantry = [] } = useQuery({
    queryKey: nutritionPantryKeys.list(atletaUserId),
    enabled: !!atletaUserId,
    queryFn: () => listPantryItems(atletaUserId),
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: nutritionDiaryKeys.day(atletaUserId, day),
    enabled: !!atletaUserId,
    queryFn: () => listDiaryEntries(atletaUserId, day),
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
    <PTAppPageShell
      title="Diario atleta"
      description="Solo lettura — aderenza al piano"
      showBack
      backTo={`/pt/app/nutrition/atleta/${atletaUserId}`}
    >
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => shiftDay(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <p className="text-sm font-medium capitalize">
          {format(new Date(day + 'T12:00:00'), 'EEEE d MMM', { locale: it })}
        </p>
        <Button variant="ghost" size="icon" onClick={() => shiftDay(1)}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {recentDays.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {recentDays.slice(0, 7).map((d) => (
            <Button
              key={d}
              size="sm"
              variant={d === day ? 'default' : 'outline'}
              onClick={() => setDay(d)}
            >
              {format(new Date(d + 'T12:00:00'), 'd MMM', { locale: it })}
            </Button>
          ))}
        </div>
      )}

      <MacroSummaryBar actual={totals} target={target} className="mb-4" />

      {pantry.length > 0 && (
        <div className="rounded-xl border border-app-border bg-app-card p-3 mb-4">
          <p className="text-xs font-semibold uppercase text-app-muted-foreground mb-2">Dispensa atleta</p>
          <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
            {pantry.slice(0, 12).map((p) => (
              <li key={p.id} className="text-app-muted-foreground">
                {p.custom_name} — {p.quantity} {p.unit}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-center text-app-muted-foreground">Caricamento…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-app-muted-foreground">Nessuna voce in questo giorno.</p>
      ) : (
        <div className="space-y-4">
          {(Object.keys(NUTRITION_MEAL_LABELS) as NutritionMealType[]).map((meal) => {
            const list = grouped.get(meal) ?? [];
            if (list.length === 0) return null;
            return (
              <div key={meal}>
                <p className="text-xs font-semibold uppercase text-app-muted-foreground mb-2">
                  {NUTRITION_MEAL_LABELS[meal]}
                </p>
                <ul className="space-y-1 text-sm">
                  {list.map((e) => (
                    <li key={e.id} className="rounded-lg border border-app-border px-3 py-2">
                      {e.custom_name} · {e.grams}g · {Math.round(Number(e.kcal))} kcal
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </PTAppPageShell>
  );
}

export default PTAppNutritionAthleteDiaryPage;
