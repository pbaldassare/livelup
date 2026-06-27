// =====================================================
// PT ASSISTANT — salvataggio assegnazioni su atleta
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { assignProgramToAthlete } from '@/lib/api/programs';
import { createWorkout } from '@/lib/api/workouts';
import { loadTemplateForWorkoutCreate } from '@/lib/api/templateLoader';
import { isoToJsDay } from '@/lib/ptAssistantParse';

const MAX_OCCURRENCES = 60;

export function generateAssignmentDates(params: {
  startDate: Date;
  endDate?: Date | null;
  activeDays: number[];
}): Date[] {
  const { startDate, endDate, activeDays } = params;
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  if (!endDate || activeDays.length === 0) {
    return [start];
  }

  const stop = new Date(endDate);
  stop.setHours(23, 59, 59, 999);
  const jsDays = new Set(activeDays.map(isoToJsDay));
  const dates: Date[] = [];
  const cursor = new Date(start);

  while (cursor <= stop && dates.length < MAX_OCCURRENCES) {
    if (jsDays.has(cursor.getDay())) {
      dates.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates.length > 0 ? dates : [start];
}

export async function saveProgramAssignment(params: {
  ptUserId: string;
  athleteId: string;
  programId: string;
  startDate: Date;
  activeDays?: number[];
}) {
  return assignProgramToAthlete({
    ptUserId: params.ptUserId,
    atletaUserId: params.athleteId,
    programId: params.programId,
    startDate: params.startDate,
    activeDays: params.activeDays,
  });
}

export async function countOccupiedAssignmentDates(params: {
  athleteId: string;
  ptUserId: string;
  dates: Date[];
}): Promise<number> {
  if (params.dates.length === 0) return 0;

  const isos = params.dates.map((d) => d.toISOString());
  const { data, error } = await supabase
    .from('workouts')
    .select('scheduled_date')
    .eq('atleta_user_id', params.athleteId)
    .eq('pt_user_id', params.ptUserId)
    .in('scheduled_date', isos);

  if (error) throw error;
  return data?.length ?? 0;
}

export async function loadTemplateExerciseRowIds(templateId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('template_exercises')
    .select('id')
    .eq('template_id', templateId)
    .order('order_index');

  if (error) throw error;
  return (data || []).map((r) => r.id);
}

export async function saveSchedaAssignment(params: {
  ptUserId: string;
  athleteId: string;
  templateId: string;
  templateTitle: string;
  dates: Date[];
  selectedExerciseRowIds: string[];
}) {
  const { blocks, exercises } = await loadTemplateForWorkoutCreate(params.templateId);

  const { data: templateRows, error } = await supabase
    .from('template_exercises')
    .select('id, exercise_id, order_index')
    .eq('template_id', params.templateId)
    .order('order_index');
  if (error) throw error;

  const rowIds =
    params.selectedExerciseRowIds.length > 0
      ? params.selectedExerciseRowIds
      : (templateRows || []).map((r) => r.id);

  const selectedIds = new Set(rowIds);
  const allowedKeys = new Set(
    (templateRows || [])
      .filter((r) => selectedIds.has(r.id))
      .map((r) => `${r.exercise_id}:${r.order_index}`),
  );

  const exercisesPayload = exercises.filter((ex) =>
    allowedKeys.has(`${ex.exerciseId}:${ex.orderIndex}`),
  );

  const usedBlockIds = new Set(
    exercisesPayload.map((ex) => ex.blockTempId).filter(Boolean) as string[],
  );
  const blocksPayload = blocks.filter((b) => usedBlockIds.has(b.tempId));

  let created = 0;
  let skipped = 0;

  for (const date of params.dates) {
    const iso = date.toISOString();
    const { data: existing } = await supabase
      .from('workouts')
      .select('id')
      .eq('atleta_user_id', params.athleteId)
      .eq('pt_user_id', params.ptUserId)
      .eq('scheduled_date', iso)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    await createWorkout({
      atletaUserId: params.athleteId,
      ptUserId: params.ptUserId,
      title: params.templateTitle,
      templateId: params.templateId,
      scheduledDate: iso,
      exercises: exercisesPayload,
      blocks: blocksPayload.length > 0 ? blocksPayload : undefined,
    });
    created++;
  }

  if (created > 0) {
    await supabase.from('notifications').insert({
      user_id: params.athleteId,
      type: 'workout_assigned',
      title: created === 1 ? 'Nuovo allenamento!' : `${created} allenamenti assegnati`,
      body:
        created === 1
          ? `Il tuo Coach ti ha assegnato: ${params.templateTitle}`
          : `Il tuo Coach ti ha assegnato "${params.templateTitle}" su ${created} giorni`,
      action_url: '/app/scheda',
      data: { pt_user_id: params.ptUserId, template_id: params.templateId },
    });
  }

  return { created, skipped };
}
