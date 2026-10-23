import type { FoodTemplate } from '@/types/nutrition';
import { nutritionDb } from './db';

export type PantryUnit = 'g' | 'ml' | 'pz';

export interface NutritionPantryItem {
  id: string;
  atleta_user_id: string;
  food_template_id: string | null;
  custom_name: string | null;
  quantity: number;
  unit: PantryUnit;
  expires_on: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const nutritionPantryKeys = {
  list: (atletaUserId: string) => ['nutrition-pantry', atletaUserId] as const,
};

export async function listPantryItems(atletaUserId: string): Promise<NutritionPantryItem[]> {
  const { data, error } = await nutritionDb()
    .from('nutrition_pantry_items')
    .select('*')
    .eq('atleta_user_id', atletaUserId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as NutritionPantryItem[];
}

export interface UpsertPantryInput {
  atletaUserId: string;
  foodTemplateId?: string | null;
  customName?: string | null;
  quantity: number;
  unit: PantryUnit;
  expiresOn?: string | null;
  notes?: string | null;
}

export async function addPantryItem(input: UpsertPantryInput): Promise<NutritionPantryItem> {
  const { data, error } = await nutritionDb()
    .from('nutrition_pantry_items')
    .insert({
      atleta_user_id: input.atletaUserId,
      food_template_id: input.foodTemplateId ?? null,
      custom_name: input.customName?.trim() || null,
      quantity: input.quantity,
      unit: input.unit,
      expires_on: input.expiresOn ?? null,
      notes: input.notes ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as NutritionPantryItem;
}

export async function updatePantryItem(
  id: string,
  patch: Partial<Pick<NutritionPantryItem, 'quantity' | 'unit' | 'expires_on' | 'notes'>>,
): Promise<NutritionPantryItem> {
  const { data, error } = await nutritionDb()
    .from('nutrition_pantry_items')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as NutritionPantryItem;
}

export async function deletePantryItem(id: string): Promise<void> {
  const { error } = await nutritionDb().from('nutrition_pantry_items').delete().eq('id', id);
  if (error) throw error;
}

export function pantryItemLabel(
  item: NutritionPantryItem,
  food?: FoodTemplate | null,
): string {
  return item.custom_name ?? food?.name ?? 'Alimento';
}
