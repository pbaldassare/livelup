// =====================================================
// AMRAP PROTOCOL — Flat exercise-list helpers
// =====================================================
// Schema:
//   {
//     duration_seconds: number,    // timer globale
//     exercises_count: number,     // sempre === exercises.length
//     exercises: [{ id, exercise_id?, name, mode?, reps, duration_seconds?, weight }]
//   }
//
// `normalizeAmrapParams` è una pura trasformazione in memoria:
// non scrive mai nel DB e non causa effetti collaterali.
// Serve solo per rendering e compat con AMRAP legacy
// (duration_minutes / reps / note).
// =====================================================

import {
  normalizeProtocolTarget,
  type ProtocolExerciseTarget,
} from '@/lib/protocols/exerciseTarget';
import {
  defaultLoadFields,
  normalizeLoad,
  type LoadFields,
} from '@/lib/loadPrescription';
import type { SetTargetMode } from '@/types/database';

export type AmrapExercise = {
  id: string;
  exercise_id?: string;
  name: string;
  mode?: SetTargetMode;
  reps: number | null;
  duration_seconds?: number | null;
} & LoadFields;

export type AmrapParams = {
  duration_seconds: number;
  exercises_count: number;
  exercises: AmrapExercise[];
  // Legacy retro-compat (mai usati nella nuova UI):
  duration_minutes?: number | null;
  reps?: number | null;
  note?: string | null;
};

function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function makeAmrapExercise(partial?: Partial<AmrapExercise>): AmrapExercise {
  const target = normalizeProtocolTarget(partial as ProtocolExerciseTarget | undefined);
  const load = normalizeLoad((partial ?? {}) as Record<string, unknown>);
  return {
    id: uid('amrap_ex'),
    name: '',
    ...defaultLoadFields(),
    ...partial,
    mode: partial?.mode ?? target.mode,
    reps: partial?.reps !== undefined ? partial.reps : target.reps,
    duration_seconds:
      partial?.duration_seconds !== undefined
        ? partial.duration_seconds
        : target.duration_seconds,
    load_mode: load.load_mode,
    weight: load.weight,
    band_color: load.band_color,
    other_text: load.other_text,
  };
}

/**
 * Garantisce exercises.length === count. Min 1.
 * Aumenta → append vuoti. Diminuisce → tronca.
 */
export function syncExercisesCount(list: AmrapExercise[], count: number): AmrapExercise[] {
  const target = Math.max(1, Math.floor(count));
  if (list.length === target) return list;
  if (list.length < target) {
    const next = [...list];
    while (next.length < target) next.push(makeAmrapExercise());
    return next;
  }
  return list.slice(0, target);
}

/**
 * Normalizza i params AMRAP nella nuova forma piatta.
 * Pure: non muta `raw` e non scrive nel DB.
 */
export function normalizeAmrapParams(raw: Record<string, unknown> | null | undefined): AmrapParams {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  // duration_seconds: number > 0 oppure duration_minutes × 60, fallback 600
  let duration_seconds: number;
  const ds = r.duration_seconds;
  if (typeof ds === 'number' && Number.isFinite(ds) && ds > 0) {
    duration_seconds = Math.floor(ds);
  } else {
    const dm = r.duration_minutes;
    if (typeof dm === 'number' && Number.isFinite(dm) && dm > 0) {
      duration_seconds = Math.floor(dm * 60);
    } else {
      duration_seconds = 600;
    }
  }

  // exercises: array di forma stabile, fallback 1 esercizio dai legacy reps
  const rawList = Array.isArray(r.exercises) ? (r.exercises as unknown[]) : [];
  let exercises: AmrapExercise[] = rawList
    .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
    .map((e) => {
      const target = normalizeProtocolTarget(e);
      const load = normalizeLoad(e);
      const name = typeof e.name === 'string' ? (e.name as string) : '';
      const exercise_id =
        typeof e.exercise_id === 'string' ? (e.exercise_id as string) : undefined;
      const id =
        typeof e.id === 'string' && (e.id as string).length > 0
          ? (e.id as string)
          : uid('amrap_ex');
      return {
        id,
        exercise_id,
        name,
        mode: target.mode,
        reps: target.reps,
        duration_seconds: target.duration_seconds,
        ...load,
      };
    });

  if (exercises.length === 0) {
    const legacyReps =
      typeof r.reps === 'number' && Number.isFinite(r.reps) && (r.reps as number) > 0
        ? Math.floor(r.reps as number)
        : 10;
    exercises = [makeAmrapExercise({ mode: 'reps', reps: legacyReps, duration_seconds: null })];
  }

  // exercises_count: applica syncExercisesCount se valore esplicito,
  // altrimenti deriva da exercises.length. In ogni caso riallineato.
  const ecRaw = r.exercises_count;
  if (typeof ecRaw === 'number' && Number.isFinite(ecRaw) && ecRaw > 0) {
    exercises = syncExercisesCount(exercises, Math.floor(ecRaw));
  }
  const exercises_count = exercises.length;

  return {
    duration_seconds,
    exercises_count,
    exercises,
    duration_minutes: typeof r.duration_minutes === 'number' ? (r.duration_minutes as number) : null,
    reps: typeof r.reps === 'number' ? (r.reps as number) : null,
    note: typeof r.note === 'string' ? (r.note as string) : null,
  };
}

/**
 * Format seconds → "MM:SS" per UI.
 */
export function formatAmrapDurationSeconds(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
