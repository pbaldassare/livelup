import type { NutritionRecipeCategory, NutritionTemplateRecipe } from '@/types/nutrition';
import { nutritionDb } from './db';

export const nutritionRecipeKeys = {
  list: (category?: string) => ['nutrition-recipes', category ?? 'all'] as const,
  detail: (slug: string) => ['nutrition-recipe', slug] as const,
};

export async function listTemplateRecipes(
  category?: NutritionRecipeCategory,
  search?: string,
): Promise<NutritionTemplateRecipe[]> {
  let q = nutritionDb()
    .from('nutrition_template_recipes')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (category) q = q.eq('category', category);
  const term = search?.trim();
  if (term && term.length >= 2) q = q.ilike('name', `%${term}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as NutritionTemplateRecipe[];
}

export async function getTemplateRecipeBySlug(slug: string): Promise<NutritionTemplateRecipe | null> {
  const { data, error } = await nutritionDb()
    .from('nutrition_template_recipes')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return (data as NutritionTemplateRecipe | null) ?? null;
}
