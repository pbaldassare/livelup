import type { FoodTemplate, NutritionMacroTemplate } from '@/types/nutrition';
import { nutritionDb } from './db';

export async function listMacroTemplates(): Promise<NutritionMacroTemplate[]> {
  const { data, error } = await nutritionDb()
    .from('nutrition_macro_templates')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as NutritionMacroTemplate[];
}

export async function searchFoodTemplates(query: string, limit = 40): Promise<FoodTemplate[]> {
  const q = query.trim();
  let req = nutritionDb()
    .from('food_templates')
    .select('*')
    .order('name', { ascending: true })
    .limit(limit);
  if (q.length >= 2) {
    req = req.ilike('name', `%${q}%`);
  }
  const { data, error } = await req;
  if (error) throw error;
  return (data ?? []) as FoodTemplate[];
}
