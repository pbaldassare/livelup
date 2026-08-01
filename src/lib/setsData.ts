// =====================================================
// Helper per gestire i set eterogenei (sets_data)
// con fallback retro-compatibile dai campi piatti.
// =====================================================

import type { SetData, SetTargetMode } from '@/types/database';
import { defaultLoadFields, normalizeLoad } from '@/lib/loadPrescription';

export type SetItem = SetData;

export interface FlatExerciseFields {
  sets?: number | null;
  reps_min?: number | null;
  reps_max?: number | null;
  rest_seconds?: number | null;
  prescribed_duration_seconds?: number | null;
}

export function getSetTargetMode(set: SetItem | null | undefined): SetTargetMode {
  return set?.mode === 'seconds' ? 'seconds' : 'reps';
}

/** Target leggibile per UI/PDF: "10" oppure "20s". */
export function formatSetTarget(set: SetItem | null | undefined): string {
  if (!set) return '—';
  if (getSetTargetMode(set) === 'seconds') {
    const d = set.duration_seconds;
    return typeof d === 'number' && d > 0 ? `${d}s` : '—';
  }
  const r = set.reps;
  return typeof r === 'number' && r > 0 ? String(r) : '—';
}

/** Riassunto esercizio: "3×10", "3×20s", oppure "10 / 20s / 10" se misti. */
export function formatSetsTargetSummary(sets: SetItem[]): string {
  if (!sets.length) return '—';
  const labels = sets.map(formatSetTarget);
  const meaningful = labels.filter((l) => l !== '—');
  if (!meaningful.length) return '—';
  const unique = [...new Set(meaningful)];
  if (unique.length === 1) {
    return sets.length > 1 ? `${sets.length}×${unique[0]}` : unique[0];
  }
  return labels.join(' / ');
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
    return sets_data.map((s: any) => {
      const mode: SetTargetMode = s?.mode === 'seconds' ? 'seconds' : 'reps';
      const load = normalizeLoad(s);
      return {
        mode,
        reps: s?.reps ?? null,
        duration_seconds: s?.duration_seconds ?? null,
        weight: load.weight,
        load_mode: load.load_mode,
        band_color: load.band_color,
        other_text: load.other_text,
        rest_seconds: s?.rest_seconds ?? null,
      };
    });
  }
  // Fallback: deriva da campi piatti
  const n = Math.max(1, Number(flat.sets ?? 1));
  const rest = flat.rest_seconds != null ? Number(flat.rest_seconds) : 60;
  const duration =
    flat.prescribed_duration_seconds != null && flat.prescribed_duration_seconds > 0
      ? Number(flat.prescribed_duration_seconds)
      : null;
  const hasReps = flat.reps_min != null || flat.reps_max != null;
  const loadDefaults = defaultLoadFields();

  // Solo durata (legacy isTimed) → set in modalità seconds
  if (duration != null && !hasReps) {
    return Array.from({ length: n }).map(() => ({
      mode: 'seconds' as const,
      reps: null,
      duration_seconds: duration,
      ...loadDefaults,
      rest_seconds: rest,
    }));
  }

  const reps =
    flat.reps_min != null
      ? Number(flat.reps_min)
      : flat.reps_max != null
        ? Number(flat.reps_max)
        : null;
  return Array.from({ length: n }).map(() => ({
    mode: 'reps' as const,
    reps,
    duration_seconds: null,
    ...loadDefaults,
    rest_seconds: rest,
  }));
}

/**
 * Calcola il riassunto da scrivere nei campi piatti
 * (così le query legacy che leggono prescribed_sets / reps_min / reps_max
 * / prescribed_duration_seconds continuano a vedere valori sensati).
 */
export function summarizeSets(sets: SetItem[]): {
  sets: number;
  reps_min: number | null;
  reps_max: number | null;
  rest_seconds: number | null;
  prescribed_duration_seconds: number | null;
} {
  if (!sets.length) {
    return {
      sets: 1,
      reps_min: null,
      reps_max: null,
      rest_seconds: null,
      prescribed_duration_seconds: null,
    };
  }

  const repsModeSets = sets.filter((s) => getSetTargetMode(s) === 'reps');
  const secondsModeSets = sets.filter((s) => getSetTargetMode(s) === 'seconds');

  const repsValues = repsModeSets
    .map((s) => s.reps)
    .filter((r): r is number => typeof r === 'number' && r > 0);
  const durationValues = secondsModeSets
    .map((s) => s.duration_seconds)
    .filter((d): d is number => typeof d === 'number' && d > 0);
  const restValues = sets
    .map((s) => s.rest_seconds)
    .filter((r): r is number => typeof r === 'number' && r > 0);

  const onlySeconds = secondsModeSets.length > 0 && repsModeSets.length === 0;

  // Durata piatta: primo set in seconds (quando ci sono set a tempo)
  let prescribed_duration_seconds: number | null = null;
  if (secondsModeSets.length > 0) {
    const firstWithDuration = secondsModeSets.find(
      (s) => typeof s.duration_seconds === 'number' && s.duration_seconds > 0,
    );
    prescribed_duration_seconds =
      firstWithDuration?.duration_seconds ?? durationValues[0] ?? null;
  }

  return {
    sets: sets.length,
    reps_min: onlySeconds ? null : repsValues.length ? Math.min(...repsValues) : null,
    reps_max: onlySeconds ? null : repsValues.length ? Math.max(...repsValues) : null,
    rest_seconds: restValues.length
      ? Math.round(restValues.reduce((a, b) => a + b, 0) / restValues.length)
      : null,
    prescribed_duration_seconds,
  };
}

export const DEFAULT_SET: SetItem = {
  mode: 'reps',
  reps: 10,
  duration_seconds: null,
  ...defaultLoadFields(),
  rest_seconds: 60,
};
