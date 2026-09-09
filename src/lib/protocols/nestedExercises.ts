// =====================================================
// Nested exercises inside a protocol block (flat list).
// Used by Ladder, Dead Ladder, Ramping, RxT, Running Total,
// Top Set + Back Off — same shape as AMRAP exercises[].
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
import type { ProtocolParams, ProtocolType } from '@/lib/protocols/registry';
import type { SetTargetMode } from '@/types/database';

export type NestedProtocolExercise = {
  id: string;
  exercise_id?: string;
  name: string;
  mode?: SetTargetMode;
  reps: number | null;
  duration_seconds?: number | null;
  notes?: string;
} & LoadFields;

export const PROTOCOLS_WITH_GENERIC_NESTED_EXERCISES: ReadonlyArray<
  Exclude<ProtocolType, 'SET'>
> = ['TOP_SET_BACKOFF', 'RAMPING', 'LADDER', 'DEAD_LADDER', 'RXT', 'RUNNING_TOTAL'];

export function hasGenericNestedExercises(
  type: ProtocolType | string | null | undefined,
): boolean {
  return PROTOCOLS_WITH_GENERIC_NESTED_EXERCISES.includes(
    type as Exclude<ProtocolType, 'SET'>,
  );
}

function uid(prefix = 'nex'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function makeNestedExercise(
  partial?: Partial<NestedProtocolExercise>,
): NestedProtocolExercise {
  const target = normalizeProtocolTarget(partial as ProtocolExerciseTarget | undefined);
  const load = normalizeLoad((partial ?? {}) as Record<string, unknown>);
  return {
    id: uid('nex'),
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

export function syncNestedExercisesCount(
  list: NestedProtocolExercise[],
  count: number,
): NestedProtocolExercise[] {
  const target = Math.max(1, Math.floor(count));
  if (list.length === target) return list;
  if (list.length < target) {
    const next = [...list];
    while (next.length < target) next.push(makeNestedExercise());
    return next;
  }
  return list.slice(0, target);
}

function mapRawExercise(
  e: Record<string, unknown>,
  fallbackId?: string,
): NestedProtocolExercise {
  const target = normalizeProtocolTarget(e);
  const load = normalizeLoad(e);
  const name = typeof e.name === 'string' ? e.name : '';
  const exercise_id = typeof e.exercise_id === 'string' ? e.exercise_id : undefined;
  const id =
    typeof e.id === 'string' && e.id.length > 0 ? e.id : fallbackId || uid('nex');
  const notes = typeof e.notes === 'string' ? e.notes : undefined;
  return {
    id,
    exercise_id,
    name,
    notes,
    mode: target.mode,
    reps: target.reps,
    duration_seconds: target.duration_seconds,
    ...load,
  };
}

/**
 * Always returns ≥1 slot. Empty protocol_params.exercises → one blank picker.
 * `stableIdPrefix` keeps generated empty-slot ids stable across re-renders.
 */
export function normalizeNestedExercises(
  raw: Record<string, unknown> | ProtocolParams | null | undefined,
  opts?: { stableIdPrefix?: string; emptyCount?: number },
): NestedProtocolExercise[] {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const rawList = Array.isArray(r.exercises) ? (r.exercises as unknown[]) : [];
  let exercises: NestedProtocolExercise[] = rawList
    .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
    .map((e, i) =>
      mapRawExercise(
        e,
        opts?.stableIdPrefix ? `${opts.stableIdPrefix}-ex-${i}` : undefined,
      ),
    );

  const emptyCount = Math.max(1, opts?.emptyCount ?? 1);
  if (exercises.length === 0) {
    exercises = Array.from({ length: emptyCount }, (_, i) =>
      makeNestedExercise(
        opts?.stableIdPrefix ? { id: `${opts.stableIdPrefix}-ex-${i}` } : undefined,
      ),
    );
  }

  const ecRaw = r.exercises_count;
  if (typeof ecRaw === 'number' && Number.isFinite(ecRaw) && ecRaw > 0) {
    exercises = syncNestedExercisesCount(exercises, Math.floor(ecRaw));
  }

  return exercises;
}

export function emptyNestedExerciseSlots(count: number): NestedProtocolExercise[] {
  const n = Math.max(1, Math.floor(count));
  return Array.from({ length: n }, () => makeNestedExercise());
}

export function withNestedExercises<T extends object>(
  params: T,
  exercises: NestedProtocolExercise[],
): T & { exercises: NestedProtocolExercise[]; exercises_count: number } {
  return {
    ...params,
    exercises,
    exercises_count: exercises.length,
  };
}

export function emptySlotCountForProtocol(
  type: Exclude<ProtocolType, 'SET'>,
): number {
  if (type === 'RXT' || type === 'RUNNING_TOTAL') return 2;
  return 1;
}
