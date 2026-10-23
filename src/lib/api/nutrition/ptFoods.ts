import type { FoodTemplate } from '@/types/nutrition';
import { nutritionDb } from './db';

export const nutritionPtFoodKeys = {
  list: (ptUserId: string) => ['nutrition-pt-foods', ptUserId] as const,
};

export async function listPtCustomFoods(ptUserId: string): Promise<FoodTemplate[]> {
  const { data, error } = await nutritionDb()
    .from('food_templates')
    .select('*')
    .eq('pt_user_id', ptUserId)
    .order('name');
  if (error) throw error;
  return (data ?? []) as FoodTemplate[];
}

export interface CreatePtFoodInput {
  ptUserId: string;
  name: string;
  brand?: string | null;
  per100gKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export async function createPtCustomFood(input: CreatePtFoodInput): Promise<FoodTemplate> {
  const { data, error } = await nutritionDb()
    .from('food_templates')
    .insert({
      pt_user_id: input.ptUserId,
      name: input.name.trim(),
      brand: input.brand?.trim() || null,
      per_100g_kcal: input.per100gKcal,
      per_100g_protein_g: input.proteinG,
      per_100g_carbs_g: input.carbsG,
      per_100g_fat_g: input.fatG,
      is_platform: false,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as FoodTemplate;
}

export async function deletePtCustomFood(foodId: string): Promise<void> {
  const { error } = await nutritionDb().from('food_templates').delete().eq('id', foodId);
  if (error) throw error;
}
