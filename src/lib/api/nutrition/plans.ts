import type { NutritionPlan } from '@/types/nutrition';
import { nutritionDb } from './db';

export const nutritionPlanKeys = {
  activeForAtleta: (atletaUserId: string) => ['nutrition-plan-active', atletaUserId] as const,
  forAtleta: (atletaUserId: string) => ['nutrition-plans', atletaUserId] as const,
  ptOverview: (ptUserId: string) => ['nutrition-pt-overview', ptUserId] as const,
};

export async function getActiveNutritionPlan(atletaUserId: string): Promise<NutritionPlan | null> {
  const { data, error } = await nutritionDb()
    .from('nutrition_plans')
    .select('*')
    .eq('atleta_user_id', atletaUserId)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return (data as NutritionPlan | null) ?? null;
}

export async function listNutritionPlansForAtleta(atletaUserId: string): Promise<NutritionPlan[]> {
  const { data, error } = await nutritionDb()
    .from('nutrition_plans')
    .select('*')
    .eq('atleta_user_id', atletaUserId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as NutritionPlan[];
}

export interface CreateNutritionPlanInput {
  atletaUserId: string;
  ptUserId: string;
  macroTemplateId?: string | null;
  title?: string;
  notes?: string | null;
  dailyKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  activate?: boolean;
}

export async function createNutritionPlan(input: CreateNutritionPlanInput): Promise<NutritionPlan> {
  const { data, error } = await nutritionDb()
    .from('nutrition_plans')
    .insert({
      atleta_user_id: input.atletaUserId,
      pt_user_id: input.ptUserId,
      macro_template_id: input.macroTemplateId ?? null,
      title: input.title?.trim() || 'Piano nutrizionale',
      notes: input.notes ?? null,
      daily_kcal: input.dailyKcal,
      protein_g: input.proteinG,
      carbs_g: input.carbsG,
      fat_g: input.fatG,
      is_active: false,
    })
    .select('*')
    .single();
  if (error) throw error;
  const plan = data as NutritionPlan;
  if (input.activate) {
    return activateNutritionPlan(plan.id);
  }
  return plan;
}

export async function activateNutritionPlan(planId: string): Promise<NutritionPlan> {
  const { data, error } = await nutritionDb().rpc('activate_nutrition_plan', { _plan_id: planId });
  if (error) throw error;
  return data as NutritionPlan;
}

export async function updateNutritionPlan(
  planId: string,
  patch: Partial<
    Pick<
      NutritionPlan,
      'title' | 'notes' | 'daily_kcal' | 'protein_g' | 'carbs_g' | 'fat_g' | 'starts_on' | 'ends_on'
    >
  >,
): Promise<NutritionPlan> {
  const { data, error } = await nutritionDb()
    .from('nutrition_plans')
    .update(patch)
    .eq('id', planId)
    .select('*')
    .single();
  if (error) throw error;
  return data as NutritionPlan;
}

export async function listActivePlansForPtAthletes(
  atletaUserIds: string[],
): Promise<Record<string, NutritionPlan | null>> {
  if (atletaUserIds.length === 0) return {};
  const { data, error } = await nutritionDb()
    .from('nutrition_plans')
    .select('*')
    .in('atleta_user_id', atletaUserIds)
    .eq('is_active', true);
  if (error) throw error;
  const map: Record<string, NutritionPlan | null> = {};
  for (const id of atletaUserIds) map[id] = null;
  for (const row of (data ?? []) as NutritionPlan[]) {
    map[row.atleta_user_id] = row;
  }
  return map;
}
