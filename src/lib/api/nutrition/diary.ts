import type { NutritionDiaryEntry, NutritionMealType } from '@/types/nutrition';
import type { MacroTotals } from '@/types/nutrition';
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

export async function deleteDiaryEntry(entryId: string): Promise<void> {
  const { error } = await nutritionDb().from('nutrition_diary_entries').delete().eq('id', entryId);
  if (error) throw error;
}
