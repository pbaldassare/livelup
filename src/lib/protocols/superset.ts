// =====================================================
// SUPERSET PROTOCOL — Structured helpers
// =====================================================
// Schema (in memoria, JSON in protocol_params):
//   {
//     exercises_count, supersets_count,
//     rest_between_supersets,
//     rest_between_exercises_enabled, rest_between_exercises,
//     exercises: [{ id, exercise_id?, name, mode?, reps, duration_seconds?, weight, notes }],
//     set_data: [{ exercise_id?, exercise_name,
//                  sets: [{ set_number, mode?, reps, duration_seconds?, weight, rest_seconds }] }]
//   }
//
// Invarianti garantiti da normalize + syncExercisesCount + syncSetData:
//   - exercises.length === exercises_count
//   - set_data.length === exercises_count
//   - per ogni riga: sets.length === supersets_count
//   - set_data[r].sets[c].set_number === c + 1
//
// `set_data` è la fonte di verità a runtime per l'atleta:
//   set_data[r].sets[c] = valori dell'esercizio r durante il superset (c+1).
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

export type SupersetExercise = {
  id: string;
  exercise_id?: string;
  name: string;
  mode?: SetTargetMode;
  reps: number | null;
  duration_seconds?: number | null;
  notes: string;
} & LoadFields;

export type SupersetSetCell = {
  set_number: number;
  mode?: SetTargetMode;
  reps: number | null;
  duration_seconds?: number | null;
  rest_seconds: number;
} & LoadFields;

export type SupersetSetRow = {
  exercise_id?: string;
  exercise_name: string;
  sets: SupersetSetCell[];
};

export type SupersetParams = {
  exercises_count: number;
  supersets_count: number;
  rest_between_supersets: number;
  rest_between_exercises_enabled: boolean;
  rest_between_exercises: number | null;
  exercises: SupersetExercise[];
  set_data: SupersetSetRow[];
};

const DEFAULT_REPS = 10;
const DEFAULT_REST_BETWEEN_SUPERSETS = 90;
const DEFAULT_REST_BETWEEN_EXERCISES = 30;
const DEFAULT_EXERCISES_COUNT = 2;
const DEFAULT_SUPERSETS_COUNT = 3;

function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function makeSupersetExercise(
  partial?: Partial<SupersetExercise>,
): SupersetExercise {
  const target = normalizeProtocolTarget(partial as ProtocolExerciseTarget | undefined);
  const load = normalizeLoad((partial ?? {}) as Record<string, unknown>);
  return {
    id: uid('ss_ex'),
    name: '',
    notes: '',
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

/** Garantisce exercises.length === count. Min 1. */
export function syncExercisesCount(
  list: SupersetExercise[],
  count: number,
): SupersetExercise[] {
  const target = Math.max(1, Math.floor(count));
  if (list.length === target) return list;
  if (list.length < target) {
    const next = [...list];
    while (next.length < target) next.push(makeSupersetExercise());
    return next;
  }
  return list.slice(0, target);
}

function makeCell(
  index: number,
  exercise: SupersetExercise | undefined,
  restDefault: number,
): SupersetSetCell {
  const target = normalizeProtocolTarget(exercise as ProtocolExerciseTarget | undefined);
  const load = normalizeLoad((exercise ?? {}) as Record<string, unknown>);
  return {
    set_number: index + 1,
    mode: exercise?.mode ?? target.mode,
    reps: exercise?.reps !== undefined ? exercise.reps : target.reps,
    duration_seconds:
      exercise?.duration_seconds !== undefined
        ? exercise.duration_seconds
        : target.duration_seconds,
    ...load,
    rest_seconds: Math.max(0, Math.floor(restDefault)),
  };
}

/**
 * Resize righe (per esercizio) e colonne (numero superset), preservando
 * sempre le celle esistenti. Non sovrascrive valori personalizzati.
 */
export function syncSetData(
  setData: SupersetSetRow[],
  exercises: SupersetExercise[],
  supersetsCount: number,
  restBetweenSupersets: number,
): SupersetSetRow[] {
  const colCount = Math.max(1, Math.floor(supersetsCount));
  const out: SupersetSetRow[] = exercises.map((ex, rIdx) => {
    const existing = setData[rIdx];
    const baseSets = existing?.sets ?? [];
    const sets: SupersetSetCell[] = [];
    for (let c = 0; c < colCount; c++) {
      const prev = baseSets[c];
      if (prev) {
        sets.push({ ...prev, set_number: c + 1 });
      } else {
        sets.push(makeCell(c, ex, restBetweenSupersets));
      }
    }
    return {
      exercise_id: ex.exercise_id,
      exercise_name: ex.name,
      sets,
    };
  });
  return out;
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function posInt(v: unknown, fallback: number): number {
  const n = num(v, fallback);
  return n > 0 ? Math.floor(n) : fallback;
}

function nonNegInt(v: unknown, fallback: number): number {
  const n = num(v, fallback);
  return n >= 0 ? Math.floor(n) : fallback;
}

/**
 * Normalizza i params SUPERSET. Pura, in memoria, mai persistita.
 * Migra il vecchio schema (paired_exercise_id / internal_rest_seconds / …)
 * in 2 esercizi + N supersets, costruendo set_data consistente.
 */
export function normalizeSupersetParams(
  raw: Record<string, unknown> | null | undefined,
): SupersetParams {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  // Detect legacy
  const hasNewSchema = Array.isArray(r.exercises) && (r.exercises as unknown[]).length > 0;

  // -- Globals ---------------------------------------------------------
  const rest_between_supersets = nonNegInt(
    r.rest_between_supersets ?? r.external_rest_seconds,
    DEFAULT_REST_BETWEEN_SUPERSETS,
  );

  const rest_between_exercises_enabled =
    typeof r.rest_between_exercises_enabled === 'boolean'
      ? (r.rest_between_exercises_enabled as boolean)
      : true;

  const rest_between_exercises_raw =
    r.rest_between_exercises ?? r.internal_rest_seconds ?? DEFAULT_REST_BETWEEN_EXERCISES;
  const rest_between_exercises = rest_between_exercises_enabled
    ? nonNegInt(rest_between_exercises_raw, DEFAULT_REST_BETWEEN_EXERCISES)
    : null;

  const supersets_count = posInt(
    r.supersets_count ?? r.sets,
    DEFAULT_SUPERSETS_COUNT,
  );

  // -- Exercises -------------------------------------------------------
  let exercises: SupersetExercise[];
  if (hasNewSchema) {
    exercises = (r.exercises as unknown[])
      .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
      .map((e) => {
        const target = normalizeProtocolTarget(e);
        const load = normalizeLoad(e);
        return {
          id:
            typeof e.id === 'string' && (e.id as string).length > 0
              ? (e.id as string)
              : uid('ss_ex'),
          exercise_id:
            typeof e.exercise_id === 'string' ? (e.exercise_id as string) : undefined,
          name: typeof e.name === 'string' ? (e.name as string) : '',
          mode: target.mode,
          reps: target.reps,
          duration_seconds: target.duration_seconds,
          ...load,
          notes: typeof e.notes === 'string' ? (e.notes as string) : '',
        };
      });
    if (exercises.length === 0) {
      exercises = [makeSupersetExercise()];
    }
  } else {
    // Legacy: build placeholder list of 2 esercizi (A + B)
    const legacyReps = posInt(r.reps, DEFAULT_REPS);
    exercises = [
      makeSupersetExercise({ reps: legacyReps }),
      makeSupersetExercise({ reps: legacyReps }),
    ];
  }

  // exercises_count: applica se esplicito, altrimenti deriva da length.
  const ecRaw = r.exercises_count;
  if (typeof ecRaw === 'number' && Number.isFinite(ecRaw) && ecRaw > 0) {
    exercises = syncExercisesCount(exercises, Math.floor(ecRaw));
  } else if (exercises.length === 0) {
    exercises = [makeSupersetExercise()];
  }
  const exercises_count = exercises.length;

  // -- set_data --------------------------------------------------------
  const rawSetData = Array.isArray(r.set_data) ? (r.set_data as unknown[]) : [];
  const parsedSetData: SupersetSetRow[] = rawSetData
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map((row) => {
      const sets = Array.isArray(row.sets) ? (row.sets as unknown[]) : [];
      return {
        exercise_id:
          typeof row.exercise_id === 'string' ? (row.exercise_id as string) : undefined,
        exercise_name:
          typeof row.exercise_name === 'string' ? (row.exercise_name as string) : '',
        sets: sets
          .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
          .map((c, idx) => {
            const target = normalizeProtocolTarget(c);
            const load = normalizeLoad(c);
            return {
              set_number: posInt(c.set_number, idx + 1),
              mode: target.mode,
              reps: target.reps,
              duration_seconds: target.duration_seconds,
              ...load,
              rest_seconds: nonNegInt(c.rest_seconds, rest_between_supersets),
            };
          }),
      };
    });

  const set_data = syncSetData(
    parsedSetData,
    exercises,
    supersets_count,
    rest_between_supersets,
  );

  return {
    exercises_count,
    supersets_count,
    rest_between_supersets,
    rest_between_exercises_enabled,
    rest_between_exercises,
    exercises,
    set_data,
  };
}
