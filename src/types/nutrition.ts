export type NutritionMealType =
  | 'colazione'
  | 'spuntino_mattina'
  | 'pranzo'
  | 'spuntino_sera'
  | 'cena'
  | 'altro';

export const NUTRITION_MEAL_LABELS: Record<NutritionMealType, string> = {
  colazione: 'Colazione',
  spuntino_mattina: 'Spuntino mattina',
  pranzo: 'Pranzo',
  spuntino_sera: 'Spuntino sera',
  cena: 'Cena',
  altro: 'Altro',
};

export interface NutritionMacroTemplate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  daily_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  is_platform: boolean;
  sort_order: number;
}

export interface FoodTemplate {
  id: string;
  name: string;
  brand: string | null;
  per_100g_kcal: number;
  per_100g_protein_g: number;
  per_100g_carbs_g: number;
  per_100g_fat_g: number;
  is_platform: boolean;
}

export interface NutritionPlan {
  id: string;
  atleta_user_id: string;
  pt_user_id: string;
  macro_template_id: string | null;
  title: string;
  notes: string | null;
  daily_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  is_active: boolean;
  starts_on: string | null;
  ends_on: string | null;
  created_at: string;
  updated_at: string;
}

export interface NutritionDiaryEntry {
  id: string;
  atleta_user_id: string;
  logged_on: string;
  meal_type: NutritionMealType;
  food_template_id: string | null;
  custom_name: string | null;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  notes: string | null;
  created_at: string;
}

export interface MacroTotals {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}
