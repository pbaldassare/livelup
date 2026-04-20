// =====================================================
// Helper: legge blocchi + esercizi di un template e li converte
// nel formato accettato da createWorkout (con blockTempId).
// Centralizzato per essere riusato sia da rotation che day_by_day.
// =====================================================

import { supabase } from '@/integrations/supabase/client';

export async function loadTemplateForWorkoutCreate(templateId: string) {
  const [blocksRes, exRes] = await Promise.all([
    supabase
      .from('template_blocks')
      .select('id, order_index, type, name, params, info_note')
      .eq('template_id', templateId)
      .order('order_index'),
    supabase
      .from('template_exercises')
      .select('exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes, block_id, prescribed_duration_seconds')
      .eq('template_id', templateId)
      .order('order_index'),
  ]);

  if (blocksRes.error) throw blocksRes.error;
  if (exRes.error) throw exRes.error;

  const blocks = (blocksRes.data || []).map((b: any) => ({
    tempId: b.id as string,
    orderIndex: b.order_index as number,
    type: b.type as string,
    name: (b.name as string | null) ?? null,
    params: b.params ?? {},
    infoNote: (b.info_note as string | null) ?? null,
  }));

  const exercises = (exRes.data || []).map((e: any) => ({
    exerciseId: e.exercise_id as string,
    orderIndex: e.order_index as number,
    prescribedSets: e.sets as number,
    prescribedRepsMin: e.reps_min ?? undefined,
    prescribedRepsMax: e.reps_max ?? undefined,
    prescribedDurationSeconds: e.prescribed_duration_seconds ?? undefined,
    restSeconds: e.rest_seconds ?? undefined,
    notes: e.notes ?? undefined,
    // block_id del template = tempId nel payload (lo riusiamo come ref)
    blockTempId: (e.block_id as string | null) ?? undefined,
  }));

  return { blocks, exercises };
}
