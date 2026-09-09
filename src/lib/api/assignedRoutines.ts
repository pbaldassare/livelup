import { supabase } from '@/integrations/supabase/client';
import { canAddRoutineExercise, nextRoutineOrderIndex } from '@/lib/pt/routineExercises';
import type { WorkoutPhase } from '@/lib/pt/templateRoles';

export type AssignedRoutinePhase = Extract<WorkoutPhase, 'warmup' | 'cooldown'>;

export type AssignedRoutineRow = {
  id: string;
  exercise_id: string;
  name: string;
  order_index: number;
  phase: AssignedRoutinePhase;
};

type RawRow = {
  id: string;
  exercise_id: string;
  order_index: number;
  phase?: string | null;
  exercises?: { name?: string | null } | null;
};

function mapRow(row: RawRow, phase: AssignedRoutinePhase): AssignedRoutineRow {
  return {
    id: row.id,
    exercise_id: row.exercise_id,
    name: row.exercises?.name?.trim() || 'Esercizio',
    order_index: row.order_index,
    phase,
  };
}

export function buildAssignedRoutineInsert(
  workoutId: string,
  phase: AssignedRoutinePhase,
  exerciseId: string,
  orderIndex: number,
) {
  return {
    workout_id: workoutId,
    exercise_id: exerciseId,
    order_index: orderIndex,
    prescribed_sets: 1,
    prescribed_reps_min: 10,
    prescribed_reps_max: null,
    rest_seconds: 30,
    protocol_type: 'SET',
    protocol_params: {},
    phase,
  };
}

async function maxWorkoutExerciseOrder(workoutId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('workout_exercises')
    .select('order_index')
    .eq('workout_id', workoutId)
    .order('order_index', { ascending: false })
    .limit(1);
  if (error || !data?.[0]) return null;
  return data[0].order_index as number;
}

export async function listAssignedRoutineExercises(
  workoutId: string,
  phase: AssignedRoutinePhase,
): Promise<AssignedRoutineRow[]> {
  const { data, error } = await (supabase.from('workout_exercises') as any)
    .select('id, exercise_id, order_index, phase, exercises ( name )')
    .eq('workout_id', workoutId)
    .eq('phase', phase)
    .order('order_index');

  if (error) {
    if (/phase|42703|PGRST204|schema cache/i.test(error.message)) return [];
    throw error;
  }

  return ((data || []) as RawRow[]).map((row) => mapRow(row, phase));
}

export async function addAssignedRoutineExercise(
  workoutId: string,
  phase: AssignedRoutinePhase,
  exerciseId: string,
  existing: { exercise_id: string; order_index: number }[],
): Promise<void> {
  const existingIds = existing.map((row) => row.exercise_id);
  if (!canAddRoutineExercise(existingIds, exerciseId)) {
    throw new Error(
      existingIds.includes(exerciseId)
        ? 'Esercizio già in elenco'
        : 'Hai raggiunto il numero massimo di esercizi',
    );
  }

  const globalMax = await maxWorkoutExerciseOrder(workoutId);
  const nextOrder = nextRoutineOrderIndex([
    ...existing.map((row) => row.order_index),
    ...(globalMax == null ? [] : [globalMax]),
  ]);
  const { error } = await (supabase.from('workout_exercises') as any).insert(
    buildAssignedRoutineInsert(workoutId, phase, exerciseId, nextOrder),
  );
  if (error) throw error;
}

export async function replaceAssignedRoutineExercise(
  rowId: string,
  exerciseId: string,
): Promise<void> {
  const { error } = await supabase
    .from('workout_exercises')
    .update({ exercise_id: exerciseId } as any)
    .eq('id', rowId);
  if (error) throw error;
}

export async function removeAssignedRoutineExercise(rowId: string): Promise<void> {
  const { error } = await supabase.from('workout_exercises').delete().eq('id', rowId);
  if (error) throw error;
}

export async function clearAssignedRoutinePhase(
  workoutId: string,
  phase: AssignedRoutinePhase,
): Promise<void> {
  const { error: exErr } = await (supabase.from('workout_exercises') as any)
    .delete()
    .eq('workout_id', workoutId)
    .eq('phase', phase);
  if (exErr && !/phase|42703|PGRST204|schema cache/i.test(exErr.message)) throw exErr;

  const { error: blkErr } = await (supabase.from('workout_blocks') as any)
    .delete()
    .eq('workout_id', workoutId)
    .eq('phase', phase);
  if (blkErr && !/phase|42703|PGRST204|schema cache/i.test(blkErr.message)) throw blkErr;
}
