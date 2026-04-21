// =====================================================
// Helper per gestire i set eterogenei (sets_data)
// con fallback retro-compatibile dai campi piatti.
// =====================================================

export interface SetItem {
  reps: number | null;
  weight: number | null;
  rest_seconds: number | null;
}

export interface FlatExerciseFields {
  sets?: number | null;
  reps_min?: number | null;
  reps_max?: number | null;
  rest_seconds?: number | null;
  prescribed_duration_seconds?: number | null;
}

/**
 * Restituisce un array di set. Se `sets_data` è valido lo usa,
 * altrimenti deriva N set identici dai campi piatti.
 */
export function resolveSetsData(
  sets_data: unknown,
  flat: FlatExerciseFields,
): SetItem[] {
  if (Array.isArray(sets_data) && sets_data.length > 0) {
    return sets_data.map((s: any) => ({
      reps: s?.reps ?? null,
      weight: s?.weight ?? null,
      rest_seconds: s?.rest_seconds ?? null,
    }));
  }
  // Fallback: deriva da campi piatti
  const n = Math.max(1, Number(flat.sets ?? 1));
  const reps =
    flat.reps_min != null
      ? Number(flat.reps_min)
      : flat.reps_max != null
        ? Number(flat.reps_max)
        : null;
  const rest = flat.rest_seconds != null ? Number(flat.rest_seconds) : 60;
  return Array.from({ length: n }).map(() => ({
    reps,
    weight: null,
    rest_seconds: rest,
  }));
}

/**
 * Calcola il riassunto da scrivere nei campi piatti
 * (così le query legacy che leggono prescribed_sets / reps_min / reps_max
 * continuano a vedere valori sensati).
 */
export function summarizeSets(sets: SetItem[]): {
  sets: number;
  reps_min: number | null;
  reps_max: number | null;
  rest_seconds: number | null;
} {
  if (!sets.length) {
    return { sets: 1, reps_min: null, reps_max: null, rest_seconds: null };
  }
  const repsValues = sets
    .map((s) => s.reps)
    .filter((r): r is number => typeof r === 'number' && r > 0);
  const restValues = sets
    .map((s) => s.rest_seconds)
    .filter((r): r is number => typeof r === 'number' && r > 0);
  return {
    sets: sets.length,
    reps_min: repsValues.length ? Math.min(...repsValues) : null,
    reps_max: repsValues.length ? Math.max(...repsValues) : null,
    rest_seconds: restValues.length
      ? Math.round(restValues.reduce((a, b) => a + b, 0) / restValues.length)
      : null,
  };
}

export const DEFAULT_SET: SetItem = { reps: 10, weight: null, rest_seconds: 60 };
