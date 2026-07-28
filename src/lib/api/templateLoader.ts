// =====================================================
// Helper: legge blocchi + esercizi di un template e li converte
// nel formato accettato da createWorkout (con blockTempId).
// Supporta anche snapshot riscaldamento / defaticamento.
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import type { WorkoutPhase } from '@/lib/pt/templateRoles';

export type LoadedTemplateBlock = {
  tempId: string;
  orderIndex: number;
  type: string;
  name?: string | null;
  params?: unknown;
  infoNote?: string | null;
  phase?: WorkoutPhase;
};

export type LoadedTemplateExercise = {
  exerciseId: string;
  orderIndex: number;
  prescribedSets: number;
  prescribedRepsMin?: number;
  prescribedRepsMax?: number;
  prescribedDurationSeconds?: number;
  restSeconds?: number;
  notes?: string;
  setsData?: unknown;
  protocolType?: string;
  protocolParams?: unknown;
  blockTempId?: string;
  phase?: WorkoutPhase;
};

async function loadSingleTemplate(
  templateId: string,
  phase: WorkoutPhase,
  orderOffset: number,
): Promise<{ blocks: LoadedTemplateBlock[]; exercises: LoadedTemplateExercise[]; nextOffset: number }> {
  const [blocksRes, exRes] = await Promise.all([
    supabase
      .from('template_blocks')
      .select('id, order_index, type, name, params, info_note')
      .eq('template_id', templateId)
      .order('order_index'),
    supabase
      .from('template_exercises')
      .select(
        'exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes, block_id, prescribed_duration_seconds, sets_data, protocol_type, protocol_params',
      )
      .eq('template_id', templateId)
      .order('order_index'),
  ]);

  if (blocksRes.error) throw blocksRes.error;
  if (exRes.error) throw exRes.error;

  const blocks = (blocksRes.data || []).map((b: any) => ({
    tempId: `${phase}:${b.id as string}`,
    orderIndex: orderOffset + (b.order_index as number),
    type: b.type as string,
    name: (b.name as string | null) ?? null,
    params: b.params ?? {},
    infoNote: (b.info_note as string | null) ?? null,
    phase,
  }));

  const exercises = (exRes.data || []).map((e: any) => ({
    exerciseId: e.exercise_id as string,
    orderIndex: orderOffset + (e.order_index as number),
    prescribedSets: e.sets as number,
    prescribedRepsMin: e.reps_min ?? undefined,
    prescribedRepsMax: e.reps_max ?? undefined,
    prescribedDurationSeconds: e.prescribed_duration_seconds ?? undefined,
    restSeconds: e.rest_seconds ?? undefined,
    notes: e.notes ?? undefined,
    setsData: e.sets_data ?? undefined,
    protocolType: (e.protocol_type as string | null) ?? 'SET',
    protocolParams: e.protocol_params ?? {},
    blockTempId: e.block_id ? `${phase}:${e.block_id as string}` : undefined,
    phase,
  }));

  const maxOrder = Math.max(
    0,
    ...blocks.map((b) => b.orderIndex),
    ...exercises.map((e) => e.orderIndex),
  );

  return {
    blocks,
    exercises,
    nextOffset: (blocks.length || exercises.length) ? maxOrder + 1 : orderOffset,
  };
}

/** Solo template indicato (phase default main). */
export async function loadTemplateForWorkoutCreate(templateId: string) {
  const { blocks, exercises } = await loadSingleTemplate(templateId, 'main', 0);
  return { blocks, exercises };
}

/**
 * Carica scheda main + eventuali warmup/cooldown collegati (flag + FK).
 * Gli esercizi di fase warmup/cooldown sono esclusi dal riepilogo sessione lato completeWorkout.
 */
export async function loadTemplateWithRoutinesForWorkoutCreate(templateId: string) {
  const { data: tpl, error } = await supabase
    .from('workout_templates')
    .select(
      'id, template_kind, include_warmup, include_cooldown, warmup_template_id, cooldown_template_id, template_role',
    )
    .eq('id', templateId)
    .single();

  if (error) throw error;

  const blocks: LoadedTemplateBlock[] = [];
  const exercises: LoadedTemplateExercise[] = [];
  let offset = 0;

  if (tpl.include_warmup && tpl.warmup_template_id) {
    const warm = await loadSingleTemplate(tpl.warmup_template_id, 'warmup', offset);
    blocks.push(...warm.blocks);
    exercises.push(...warm.exercises);
    offset = warm.nextOffset;
  }

  const main = await loadSingleTemplate(templateId, 'main', offset);
  blocks.push(...main.blocks);
  exercises.push(...main.exercises);
  offset = main.nextOffset;

  if (tpl.include_cooldown && tpl.cooldown_template_id) {
    const cool = await loadSingleTemplate(tpl.cooldown_template_id, 'cooldown', offset);
    blocks.push(...cool.blocks);
    exercises.push(...cool.exercises);
  }

  return {
    blocks,
    exercises,
    templateKind: tpl.template_kind as string | null,
  };
}
