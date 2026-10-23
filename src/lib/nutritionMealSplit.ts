import type { MacroTotals, NutritionMealType } from '@/types/nutrition';

/** Percentuali default di ripartizione kcal giornaliere */
const DEFAULT_KCAL_SHARE: Record<NutritionMealType, number> = {
  colazione: 0.25,
  spuntino_mattina: 0.1,
  pranzo: 0.3,
  spuntino_sera: 0.1,
  cena: 0.25,
  altro: 0,
};

export function defaultMealTargetsFromDaily(daily: MacroTotals): Array<{
  meal_type: NutritionMealType;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}> {
  const meals = Object.keys(DEFAULT_KCAL_SHARE) as NutritionMealType[];
  return meals
    .filter((m) => DEFAULT_KCAL_SHARE[m] > 0)
    .map((meal_type) => {
      const share = DEFAULT_KCAL_SHARE[meal_type];
      return {
        meal_type,
        kcal: Math.round(daily.kcal * share),
        protein_g: Math.round(daily.protein_g * share),
        carbs_g: Math.round(daily.carbs_g * share),
        fat_g: Math.round(daily.fat_g * share),
      };
    });
}
