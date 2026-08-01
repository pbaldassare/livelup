// =====================================================
// Protocol exercise target: reps ↔ seconds (come sets_data)
// Persistito in protocol_params.exercises[] / blocks[].exercises[].
// =====================================================

import type { SetTargetMode } from '@/types/database';

export type ProtocolExerciseTarget = {
  mode?: SetTargetMode;
  reps: number | null;
  duration_seconds?: number | null;
};

const DEFAULT_REPS = 10;
const DEFAULT_SECONDS = 20;

type TargetLike = {
  mode?: SetTargetMode | null;
  reps?: number | null;
  duration_seconds?: number | null;
} | null | undefined;

export function getProtocolTargetMode(target: TargetLike): SetTargetMode {
  return target?.mode === 'seconds' ? 'seconds' : 'reps';
}

/** Target leggibile: "10", "20s", oppure "—". */
export function formatProtocolTarget(target: TargetLike): string {
  if (!target) return '—';
  if (getProtocolTargetMode(target) === 'seconds') {
    const d = target.duration_seconds;
    return typeof d === 'number' && d > 0 ? `${d}s` : '—';
  }
  const r = target.reps;
  return typeof r === 'number' && r > 0 ? String(r) : '—';
}

/** Etichetta lunga per player atleta: "10 ripetizioni" / "20 secondi". */
export function formatProtocolTargetLabel(target: TargetLike): string {
  if (!target) return '—';
  if (getProtocolTargetMode(target) === 'seconds') {
    const d = target.duration_seconds;
    if (typeof d === 'number' && d > 0) {
      return d === 1 ? '1 secondo' : `${d} secondi`;
    }
    return '—';
  }
  const r = target.reps;
  if (typeof r === 'number' && r > 0) {
    return r === 1 ? '1 ripetizione' : `${r} ripetizioni`;
  }
  return '—';
}

/**
 * Normalizza un target grezzo (JSON protocol_params).
 * Retro-compat: solo `reps` → mode reps; legacy `measure:'time'` + `value` → seconds.
 */
export function normalizeProtocolTarget(
  raw: Record<string, unknown> | null | undefined,
  defaults?: { reps?: number; duration_seconds?: number },
): Required<ProtocolExerciseTarget> {
  const r = raw && typeof raw === 'object' ? raw : {};
  const defaultReps = defaults?.reps ?? DEFAULT_REPS;
  const defaultSeconds = defaults?.duration_seconds ?? DEFAULT_SECONDS;

  const explicitMode = r.mode === 'seconds' ? 'seconds' : r.mode === 'reps' ? 'reps' : null;
  const legacyTimed =
    r.measure === 'time' && typeof r.value === 'number' && Number.isFinite(r.value) && r.value > 0;
  const rawDuration =
    typeof r.duration_seconds === 'number' && Number.isFinite(r.duration_seconds) && r.duration_seconds > 0
      ? Math.floor(r.duration_seconds)
      : legacyTimed
        ? Math.floor(r.value as number)
        : null;
  const rawReps =
    typeof r.reps === 'number' && Number.isFinite(r.reps) && r.reps > 0
      ? Math.floor(r.reps)
      : null;

  const mode: SetTargetMode =
    explicitMode ??
    (legacyTimed || (rawDuration != null && rawReps == null) ? 'seconds' : 'reps');

  if (mode === 'seconds') {
    return {
      mode: 'seconds',
      reps: null,
      duration_seconds: rawDuration ?? defaultSeconds,
    };
  }

  return {
    mode: 'reps',
    reps: rawReps ?? defaultReps,
    duration_seconds: null,
  };
}

/** Patch per switch Reps ↔ Sec (come SetsTable). */
export function switchProtocolTargetMode(
  current: Pick<ProtocolExerciseTarget, 'mode' | 'reps' | 'duration_seconds'>,
  mode: SetTargetMode,
): Required<ProtocolExerciseTarget> {
  if (getProtocolTargetMode(current) === mode) {
    return {
      mode,
      reps: mode === 'reps' ? (current.reps ?? DEFAULT_REPS) : null,
      duration_seconds:
        mode === 'seconds' ? (current.duration_seconds ?? DEFAULT_SECONDS) : null,
    };
  }
  if (mode === 'seconds') {
    return {
      mode: 'seconds',
      reps: null,
      duration_seconds:
        typeof current.duration_seconds === 'number' && current.duration_seconds > 0
          ? current.duration_seconds
          : DEFAULT_SECONDS,
    };
  }
  return {
    mode: 'reps',
    duration_seconds: null,
    reps: typeof current.reps === 'number' && current.reps > 0 ? current.reps : DEFAULT_REPS,
  };
}

export function parsePositiveInt(raw: string, fallback = 1): number {
  if (raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}
