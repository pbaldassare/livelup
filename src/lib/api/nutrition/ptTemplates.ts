import type { NutritionPtPlanTemplate } from '@/types/nutrition';
import { nutritionDb } from './db';

export const nutritionPtTemplateKeys = {
  list: (ptUserId: string) => ['nutrition-pt-templates', ptUserId] as const,
};

export async function listPtPlanTemplates(ptUserId: string): Promise<NutritionPtPlanTemplate[]> {
  const { data, error } = await nutritionDb()
    .from('nutrition_pt_plan_templates')
    .select('*')
    .eq('pt_user_id', ptUserId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as NutritionPtPlanTemplate[];
}

export interface SavePtPlanTemplateInput {
  ptUserId: string;
  name: string;
  title: string;
  notes?: string | null;
  macroTemplateId?: string | null;
  dailyKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export async function createPtPlanTemplate(
  input: SavePtPlanTemplateInput,
): Promise<NutritionPtPlanTemplate> {
  const { data, error } = await nutritionDb()
    .from('nutrition_pt_plan_templates')
    .insert({
      pt_user_id: input.ptUserId,
      name: input.name.trim(),
      title: input.title.trim() || 'Piano nutrizionale',
      notes: input.notes ?? null,
      macro_template_id: input.macroTemplateId ?? null,
      daily_kcal: input.dailyKcal,
      protein_g: input.proteinG,
      carbs_g: input.carbsG,
      fat_g: input.fatG,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as NutritionPtPlanTemplate;
}

export async function deletePtPlanTemplate(id: string): Promise<void> {
  const { error } = await nutritionDb().from('nutrition_pt_plan_templates').delete().eq('id', id);
  if (error) throw error;
}
