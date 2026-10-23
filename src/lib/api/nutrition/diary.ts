import type {
  NutritionDiaryEntry,
  NutritionMealType,
  NutritionTemplateRecipe,
  MacroTotals,
} from '@/types/nutrition';
import { nutritionDb } from './db';

export const nutritionDiaryKeys = {
  day: (atletaUserId: string, loggedOn: string) =>
    ['nutrition-diary', atletaUserId, loggedOn] as const,
};

export async function listDiaryEntries(
  atletaUserId: string,
  loggedOn: string,
): Promise<NutritionDiaryEntry[]> {
  const { data, error } = await nutritionDb()
    .from('nutrition_diary_entries')
    .select('*')
    .eq('atleta_user_id', atletaUserId)
    .eq('logged_on', loggedOn)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as NutritionDiaryEntry[];
}

export interface AddDiaryEntryInput {
  atletaUserId: string;
  loggedOn: string;
  mealType: NutritionMealType;
  foodTemplateId?: string | null;
  recipeId?: string | null;
  customName?: string | null;
  grams: number;
  macros: MacroTotals;
  notes?: string | null;
}

export async function addDiaryEntry(input: AddDiaryEntryInput): Promise<NutritionDiaryEntry> {
  const { data, error } = await nutritionDb()
    .from('nutrition_diary_entries')
    .insert({
      atleta_user_id: input.atletaUserId,
      logged_on: input.loggedOn,
      meal_type: input.mealType,
      food_template_id: input.foodTemplateId ?? null,
      recipe_id: input.recipeId ?? null,
      custom_name: input.customName?.trim() || null,
      grams: input.grams,
      kcal: input.macros.kcal,
      protein_g: input.macros.protein_g,
      carbs_g: input.macros.carbs_g,
      fat_g: input.macros.fat_g,
      notes: input.notes ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as NutritionDiaryEntry;
}

export async function addDiaryEntryFromRecipe(
  atletaUserId: string,
  loggedOn: string,
  mealType: NutritionMealType,
  recipe: NutritionTemplateRecipe,
  servings = 1,
): Promise<NutritionDiaryEntry> {
  const s = Math.max(0.25, servings);
  return addDiaryEntry({
    atletaUserId,
    loggedOn,
    mealType,
    recipeId: recipe.id,
    customName: recipe.name,
    grams: 100 * s,
    macros: {
      kcal: Math.round(recipe.per_serving_kcal * s * 10) / 10,
      protein_g: Math.round(recipe.per_serving_protein_g * s * 10) / 10,
      carbs_g: Math.round(recipe.per_serving_carbs_g * s * 10) / 10,
      fat_g: Math.round(recipe.per_serving_fat_g * s * 10) / 10,
    },
    notes: s !== 1 ? `${s} porzioni` : null,
  });
}

export async function deleteDiaryEntry(entryId: string): Promise<void> {
  const { error } = await nutritionDb().from('nutrition_diary_entries').delete().eq('id', entryId);
  if (error) throw error;
}

/** Ultimi N giorni con almeno una voce (per monitor PT). */
export async function listRecentDiaryDays(
  atletaUserId: string,
  limit = 14,
): Promise<string[]> {
  const { data, error } = await nutritionDb()
    .from('nutrition_diary_entries')
    .select('logged_on')
    .eq('atleta_user_id', atletaUserId)
    .order('logged_on', { ascending: false })
    .limit(200);
  if (error) throw error;
  const days: string[] = [];
  const seen = new Set<string>();
  for (const row of data ?? []) {
    const d = row.logged_on as string;
    if (!seen.has(d)) {
      seen.add(d);
      days.push(d);
      if (days.length >= limit) break;
    }
  }
  return days;
}
