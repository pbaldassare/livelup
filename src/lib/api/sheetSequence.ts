/** Sequenza esercizi: catalogo (template) vs istanza assegnata (workout). */

export type SheetKind = 'template' | 'workout';

export function sheetExercisesTable(kind: SheetKind) {
  return kind === 'workout' ? 'workout_exercises' : 'template_exercises';
}

export function sheetParentColumn(kind: SheetKind) {
  return kind === 'workout' ? 'workout_id' : 'template_id';
}

const TEMPLATE_SELECT =
  'id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes, tempo, block_id, prescribed_duration_seconds, sets_data, protocol_type, protocol_params, protocol_name, library_protocol_id, exercises (*)';
const TEMPLATE_SELECT_LEGACY =
  'id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes, tempo, block_id, prescribed_duration_seconds, sets_data, protocol_type, protocol_params, exercises (*)';
const WORKOUT_SELECT =
  'id, exercise_id, order_index, prescribed_sets, prescribed_reps_min, prescribed_reps_max, rest_seconds, notes, block_id, prescribed_duration_seconds, sets_data, protocol_type, protocol_params, protocol_name, library_protocol_id, exercises (*)';
const WORKOUT_SELECT_LEGACY =
  'id, exercise_id, order_index, prescribed_sets, prescribed_reps_min, prescribed_reps_max, rest_seconds, notes, block_id, prescribed_duration_seconds, sets_data, protocol_type, protocol_params, exercises (*)';

export function sheetExerciseSelect(kind: SheetKind, legacy = false) {
  if (kind === 'workout') return legacy ? WORKOUT_SELECT_LEGACY : WORKOUT_SELECT;
  return legacy ? TEMPLATE_SELECT_LEGACY : TEMPLATE_SELECT;
}

export function normalizeSheetExerciseRow(kind: SheetKind, te: Record<string, any>) {
  const protocol_name =
    te.protocol_name ?? (te.protocol_params as { protocol_name?: string } | null)?.protocol_name ?? null;

  if (kind === 'template') {
    return {
      ...te,
      protocol_name,
      exercise: te.exercises,
    };
  }

  return {
    ...te,
    sets: te.prescribed_sets,
    reps_min: te.prescribed_reps_min,
    reps_max: te.prescribed_reps_max,
    tempo: null,
    protocol_name,
    exercise: te.exercises,
  };
}

type FlatExerciseFields = {
  sets?: number;
  reps_min?: number | null;
  reps_max?: number | null;
  rest_seconds?: number | null;
  notes?: string | null;
  tempo?: string | null;
  prescribed_duration_seconds?: number | null;
  sets_data?: unknown;
  protocol_type?: string | null;
  protocol_params?: unknown;
  protocol_name?: string | null;
  library_protocol_id?: string | null;
  block_id?: string | null;
  exercise_id?: string;
  order_index?: number;
};

export function toSheetExerciseInsert(
  kind: SheetKind,
  parentId: string,
  row: FlatExerciseFields & { exercise_id: string; order_index: number },
) {
  if (kind === 'template') {
    const { ...rest } = row;
    return { ...rest, template_id: parentId };
  }

  const { sets, reps_min, reps_max, tempo: _tempo, ...rest } = row;
  return {
    ...rest,
    workout_id: parentId,
    prescribed_sets: sets ?? 1,
    prescribed_reps_min: reps_min ?? null,
    prescribed_reps_max: reps_max ?? null,
  };
}

export function toSheetExerciseUpdate(kind: SheetKind, data: FlatExerciseFields) {
  if (kind === 'template') return data;

  const { sets, reps_min, reps_max, tempo: _tempo, ...rest } = data;
  const out: Record<string, unknown> = { ...rest };
  if (sets !== undefined) out.prescribed_sets = sets;
  if (reps_min !== undefined) out.prescribed_reps_min = reps_min;
  if (reps_max !== undefined) out.prescribed_reps_max = reps_max;
  return out;
}
