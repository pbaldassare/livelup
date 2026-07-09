import type { NextExerciseInfo } from '@/components/app/NextExercisePreview';

export interface WorkoutExerciseLike {
  id: string;
  prescribed_sets?: number | null;
  prescribed_reps_min?: number | null;
  prescribed_reps_max?: number | null;
  protocol_type?: string | null;
  exercises?: {
    name: string;
    category?: string | null;
    image_url?: string | null;
  } | null;
}

export function exerciseDisplayName(ex?: WorkoutExerciseLike | null): string {
  return ex?.exercises?.name ?? 'Esercizio';
}

export function formatRepsLabel(ex: WorkoutExerciseLike): string {
  if (ex.prescribed_reps_min && ex.prescribed_reps_max) {
    return `${ex.prescribed_reps_min}-${ex.prescribed_reps_max}`;
  }
  if (ex.prescribed_reps_min) return `${ex.prescribed_reps_min}`;
  return '—';
}

export function findNextExerciseIndex(
  exercises: WorkoutExerciseLike[],
  currentIndex: number,
  skipped: Record<string, boolean>,
): number | null {
  let i = currentIndex + 1;
  while (i < exercises.length && skipped[exercises[i].id]) i++;
  return i < exercises.length ? i : null;
}

export function findNextExercise(
  exercises: WorkoutExerciseLike[],
  currentIndex: number,
  skipped: Record<string, boolean>,
): WorkoutExerciseLike | null {
  const idx = findNextExerciseIndex(exercises, currentIndex, skipped);
  return idx != null ? exercises[idx] : null;
}

export function buildNextPreviewInfo(ex: WorkoutExerciseLike): NextExerciseInfo {
  return {
    name: exerciseDisplayName(ex),
    category: ex.exercises?.category ?? null,
    imageUrl: ex.exercises?.image_url ?? null,
    sets: ex.prescribed_sets ?? null,
    repsLabel: formatRepsLabel(ex),
    protocolType: ex.protocol_type ?? null,
  };
}

/** Recupero di transizione dopo un blocco protocollo (AMRAP, EMOM, ecc.) */
export const PROTOCOL_TRANSITION_REST_SECONDS = 60;
