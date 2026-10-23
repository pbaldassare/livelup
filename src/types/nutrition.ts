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
  pt_user_id?: string | null;
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
  recipe_id?: string | null;
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

export type NutritionRecipeCategory =
  | 'colazione'
  | 'spuntino'
  | 'pranzo'
  | 'cena'
  | 'post_allenamento'
  | 'vegetariano'
  | 'veloce';

export const NUTRITION_RECIPE_CATEGORY_LABELS: Record<NutritionRecipeCategory, string> = {
  colazione: 'Colazione',
  spuntino: 'Spuntino',
  pranzo: 'Pranzo',
  cena: 'Cena',
  post_allenamento: 'Post allenamento',
  vegetariano: 'Vegetariano',
  veloce: 'Veloci',
};

export interface NutritionTemplateRecipe {
  id: string;
  slug: string;
  category: NutritionRecipeCategory;
  name: string;
  description: string | null;
  servings: number;
  per_serving_kcal: number;
  per_serving_protein_g: number;
  per_serving_carbs_g: number;
  per_serving_fat_g: number;
  ingredients: string;
  instructions: string | null;
  sort_order: number;
}

export interface NutritionPtPlanTemplate {
  id: string;
  pt_user_id: string;
  name: string;
  title: string;
  notes: string | null;
  macro_template_id: string | null;
  daily_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
  updated_at: string;
}

export interface NutritionPlanMealTarget {
  id: string;
  plan_id: string;
  meal_type: NutritionMealType;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}
