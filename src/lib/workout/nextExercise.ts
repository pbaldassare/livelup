import type { NextExerciseInfo } from '@/components/app/NextExercisePreview';
import {
  formatSetsTargetSummary,
  resolveSetsData,
  type SetItem,
} from '@/lib/setsData';

export interface WorkoutExerciseLike {
  id: string;
  prescribed_sets?: number | null;
  prescribed_reps_min?: number | null;
  prescribed_reps_max?: number | null;
  prescribed_duration_seconds?: number | null;
  rest_seconds?: number | null;
  sets_data?: unknown;
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

function resolveLikeSets(ex: WorkoutExerciseLike): SetItem[] {
  return resolveSetsData(ex.sets_data, {
    sets: ex.prescribed_sets,
    reps_min: ex.prescribed_reps_min,
    reps_max: ex.prescribed_reps_max,
    rest_seconds: ex.rest_seconds,
    prescribed_duration_seconds: ex.prescribed_duration_seconds,
  });
}

export function formatRepsLabel(ex: WorkoutExerciseLike): string {
  const sets = resolveLikeSets(ex);
  if (sets.length > 0) {
    const summary = formatSetsTargetSummary(sets);
    if (summary !== '—') {
      // Per preview: solo il target tipico (senza "3×" se già nel campo sets)
      if (summary.includes('×')) {
        const after = summary.split('×')[1];
        return after || summary;
      }
      if (summary.includes(' / ')) {
        return summary;
      }
      return summary;
    }
  }
  if ((ex.prescribed_duration_seconds ?? 0) > 0 && !ex.prescribed_reps_min && !ex.prescribed_reps_max) {
    return `${ex.prescribed_duration_seconds}s`;
  }
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
