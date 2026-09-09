import { describe, expect, it } from 'vitest';
import {
  emptySlotCountForProtocol,
  hasGenericNestedExercises,
  makeNestedExercise,
  normalizeNestedExercises,
  syncNestedExercisesCount,
  withNestedExercises,
} from '@/lib/protocols/nestedExercises';
import { seedEmptyProtocolParams, seedParamsWithHostExercise } from '@/lib/api/ptProtocols';

describe('nestedExercises', () => {
  it('flags protocols that need a generic in-block exercise list', () => {
    expect(hasGenericNestedExercises('DEAD_LADDER')).toBe(true);
    expect(hasGenericNestedExercises('LADDER')).toBe(true);
    expect(hasGenericNestedExercises('RAMPING')).toBe(true);
    expect(hasGenericNestedExercises('RXT')).toBe(true);
    expect(hasGenericNestedExercises('RUNNING_TOTAL')).toBe(true);
    expect(hasGenericNestedExercises('TOP_SET_BACKOFF')).toBe(true);
    expect(hasGenericNestedExercises('AMRAP')).toBe(false);
    expect(hasGenericNestedExercises('EMOM')).toBe(false);
    expect(hasGenericNestedExercises('SET')).toBe(false);
  });

  it('always returns at least one empty slot', () => {
    const list = normalizeNestedExercises({}, { stableIdPrefix: 'row1' });
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('row1-ex-0');
    expect(list[0].name).toBe('');
  });

  it('keeps saved exercises and stable ids', () => {
    const list = normalizeNestedExercises({
      exercises: [
        { id: 'a', name: 'Pull-up', exercise_id: 'ex-1', reps: 8, weight: null },
        { name: 'Push-up', reps: 10, weight: 0 },
      ],
    });
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ id: 'a', name: 'Pull-up', exercise_id: 'ex-1', reps: 8 });
    expect(list[1].name).toBe('Push-up');
    expect(list[1].id).toBeTruthy();
  });

  it('syncs count by appending or truncating', () => {
    const one = [makeNestedExercise({ name: 'A' })];
    const grown = syncNestedExercisesCount(one, 3);
    expect(grown).toHaveLength(3);
    expect(grown[0].name).toBe('A');
    expect(syncNestedExercisesCount(grown, 1)).toHaveLength(1);
  });

  it('merges exercises into existing protocol params', () => {
    const next = withNestedExercises({ sets: 3, start_reps: 1 }, [
      makeNestedExercise({ name: 'Dead hang' }),
    ]);
    expect(next.sets).toBe(3);
    expect(next.start_reps).toBe(1);
    expect(next.exercises_count).toBe(1);
    expect(next.exercises[0].name).toBe('Dead hang');
  });
});

describe('seedEmptyProtocolParams nested exercises', () => {
  it('seeds empty picker slots for Dead Ladder and RxT', () => {
    const dead = seedEmptyProtocolParams('DEAD_LADDER');
    expect(dead.exercises).toHaveLength(emptySlotCountForProtocol('DEAD_LADDER'));
    expect(dead.exercises?.[0]?.name).toBe('');
    expect(dead.sets).toBe(3);

    const rxt = seedEmptyProtocolParams('RXT');
    expect(rxt.exercises).toHaveLength(2);
    expect(rxt.rounds).toBe(5);
  });

  it('does not replace dedicated AMRAP seeding', () => {
    const amrap = seedEmptyProtocolParams('AMRAP');
    expect(amrap.exercises).toHaveLength(2);
    expect(amrap.duration_seconds).toBeTypeOf('number');
  });
});

describe('seedParamsWithHostExercise nested exercises', () => {
  it('puts the host exercise inside Dead Ladder params', () => {
    const params = seedParamsWithHostExercise('DEAD_LADDER', 'ex-9', 'Trazioni');
    expect(params.exercises).toHaveLength(1);
    expect(params.exercises?.[0]).toMatchObject({
      exercise_id: 'ex-9',
      name: 'Trazioni',
    });
    expect(params.host_exercise_id).toBe('ex-9');
  });
});
