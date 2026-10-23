import type { NutritionMealType, NutritionPlanMealTarget } from '@/types/nutrition';
import { nutritionDb } from './db';

export const nutritionMealTargetKeys = {
  plan: (planId: string) => ['nutrition-meal-targets', planId] as const,
};

export async function listPlanMealTargets(planId: string): Promise<NutritionPlanMealTarget[]> {
  const { data, error } = await nutritionDb()
    .from('nutrition_plan_meal_targets')
    .select('*')
    .eq('plan_id', planId)
    .order('meal_type');
  if (error) throw error;
  return (data ?? []) as NutritionPlanMealTarget[];
}

export type MealTargetInput = {
  meal_type: NutritionMealType;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export async function replacePlanMealTargets(
  planId: string,
  targets: MealTargetInput[],
): Promise<NutritionPlanMealTarget[]> {
  const { error: delError } = await nutritionDb()
    .from('nutrition_plan_meal_targets')
    .delete()
    .eq('plan_id', planId);
  if (delError) throw delError;
  if (targets.length === 0) return [];
  const { data, error } = await nutritionDb()
    .from('nutrition_plan_meal_targets')
    .insert(
      targets.map((t) => ({
        plan_id: planId,
        meal_type: t.meal_type,
        kcal: t.kcal,
        protein_g: t.protein_g,
        carbs_g: t.carbs_g,
        fat_g: t.fat_g,
      })),
    )
    .select('*');
  if (error) throw error;
  return (data ?? []) as NutritionPlanMealTarget[];
}
