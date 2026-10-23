import type { FoodTemplate, MacroTotals } from '@/types/nutrition';

export function roundMacro(n: number): number {
  return Math.round(n * 10) / 10;
}

export function macrosForGrams(
  food: Pick<
    FoodTemplate,
    'per_100g_kcal' | 'per_100g_protein_g' | 'per_100g_carbs_g' | 'per_100g_fat_g'
  >,
  grams: number,
): MacroTotals {
  const factor = grams / 100;
  return {
    kcal: roundMacro(Number(food.per_100g_kcal) * factor),
    protein_g: roundMacro(Number(food.per_100g_protein_g) * factor),
    carbs_g: roundMacro(Number(food.per_100g_carbs_g) * factor),
    fat_g: roundMacro(Number(food.per_100g_fat_g) * factor),
  };
}

export function sumMacroTotals(entries: MacroTotals[]): MacroTotals {
  return entries.reduce(
    (acc, e) => ({
      kcal: roundMacro(acc.kcal + e.kcal),
      protein_g: roundMacro(acc.protein_g + e.protein_g),
      carbs_g: roundMacro(acc.carbs_g + e.carbs_g),
      fat_g: roundMacro(acc.fat_g + e.fat_g),
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

export function macroProgress(actual: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((actual / target) * 100));
}
