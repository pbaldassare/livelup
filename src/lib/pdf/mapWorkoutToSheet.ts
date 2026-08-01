// =====================================================
// Carica un workout assegnato + esercizi → WorkoutSheetDto
// =====================================================

import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { templateKindLabel } from '@/lib/pt/templateKinds';
import {
  formatProfileName,
  mapRawRowsToSheetItems,
  type RawSheetExerciseRow,
} from '@/lib/pdf/sheetMappersShared';
import type { WorkoutSheetDto } from '@/lib/pdf/workoutSheetTypes';

async function fetchWorkoutWithExercises(workoutId: string) {
  const fullSelect = `
    id, title, description, status, scheduled_date, notes_pt, pt_user_id, atleta_user_id,
    template_kind, created_at,
    workout_exercises (
      id, exercise_id, order_index, prescribed_sets,
      prescribed_reps_min, prescribed_reps_max, prescribed_weight,
      prescribed_duration_seconds, rest_seconds, notes, block_id,
      protocol_type, protocol_params, sets_data, phase,
      exercises:exercise_id (name, category, muscle_groups, instructions)
    )
  `;
  const legacySelect = `
    id, title, description, status, scheduled_date, notes_pt, pt_user_id, atleta_user_id,
    template_kind, created_at,
    workout_exercises (
      id, exercise_id, order_index, prescribed_sets,
      prescribed_reps_min, prescribed_reps_max, prescribed_weight,
      prescribed_duration_seconds, rest_seconds, notes, block_id,
      protocol_type, protocol_params, sets_data,
      exercises:exercise_id (name, category, muscle_groups, instructions)
    )
  `;

  const first = await supabase.from('workouts').select(fullSelect).eq('id', workoutId).single();
  if (!first.error) return first.data;

  if (/phase|42703|PGRST204|schema cache/i.test(first.error.message)) {
    const legacy = await supabase.from('workouts').select(legacySelect).eq('id', workoutId).single();
    if (legacy.error) throw legacy.error;
    return legacy.data;
  }

  throw first.error;
}

export async function mapWorkoutToSheet(workoutId: string): Promise<WorkoutSheetDto> {
  const workout = await fetchWorkoutWithExercises(workoutId);
  if (!workout) throw new Error('Allenamento non trovato');

  const userIds = [workout.pt_user_id, workout.atleta_user_id].filter(Boolean) as string[];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name, nickname')
    .in('user_id', userIds);

  const byUser = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));

  const rawRows: RawSheetExerciseRow[] = ((workout as any).workout_exercises || []).map(
    (ex: any) => ({
      order_index: ex.order_index,
      notes: ex.notes,
      prescribed_sets: ex.prescribed_sets,
      prescribed_reps_min: ex.prescribed_reps_min,
      prescribed_reps_max: ex.prescribed_reps_max,
      prescribed_weight: ex.prescribed_weight,
      prescribed_duration_seconds: ex.prescribed_duration_seconds,
      rest_seconds: ex.rest_seconds,
      sets_data: ex.sets_data,
      protocol_type: ex.protocol_type,
      protocol_params: ex.protocol_params,
      protocol_name: ex.protocol_params?.protocol_name ?? null,
      exercises: Array.isArray(ex.exercises) ? ex.exercises[0] : ex.exercises,
    }),
  );

  const items = mapRawRowsToSheetItems(rawRows);
  if (items.length === 0) {
    throw new Error('Scheda vuota: nessun esercizio da esportare');
  }

  const dateSource = workout.scheduled_date || workout.created_at;
  const dateLabel = dateSource
    ? format(new Date(dateSource), 'dd MMMM yyyy', { locale: it })
    : null;

  return {
    title: workout.title,
    ptName: formatProfileName(byUser[workout.pt_user_id]),
    athleteName: formatProfileName(byUser[workout.atleta_user_id]),
    dateLabel,
    kindLabel: templateKindLabel((workout as any).template_kind),
    description: workout.description,
    notesPt: workout.notes_pt,
    items,
    source: 'workout',
  };
}
