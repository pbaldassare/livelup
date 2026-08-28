import { describe, expect, it } from 'vitest';
import {
  normalizeSheetExerciseRow,
  toSheetExerciseInsert,
  toSheetExerciseUpdate,
} from '@/lib/api/sheetSequence';
import { firstCreatedWorkoutToActivate } from '@/lib/workoutAssignmentDelivery';

describe('sheetSequence', () => {
  it('maps workout prescribed_* into template-like fields', () => {
    const row = normalizeSheetExerciseRow('workout', {
      id: '1',
      prescribed_sets: 4,
      prescribed_reps_min: 8,
      prescribed_reps_max: 12,
      protocol_params: { protocol_name: 'EMOM' },
      exercises: { name: 'Squat' },
    });
    expect(row.sets).toBe(4);
    expect(row.reps_min).toBe(8);
    expect(row.reps_max).toBe(12);
    expect(row.protocol_name).toBe('EMOM');
    expect(row.exercise).toEqual({ name: 'Squat' });
  });

  it('inserts workout rows with prescribed_* and parent workout_id', () => {
    const insert = toSheetExerciseInsert('workout', 'w1', {
      exercise_id: 'e1',
      order_index: 0,
      sets: 3,
      reps_min: 10,
      reps_max: null,
      tempo: '3010',
    });
    expect(insert).toMatchObject({
      workout_id: 'w1',
      exercise_id: 'e1',
      prescribed_sets: 3,
      prescribed_reps_min: 10,
    });
    expect(insert).not.toHaveProperty('tempo');
    expect(insert).not.toHaveProperty('template_id');
  });

  it('remaps flat set updates onto workout columns', () => {
    const update = toSheetExerciseUpdate('workout', { sets: 5, reps_min: 6, notes: 'ok' });
    expect(update).toEqual({
      notes: 'ok',
      prescribed_sets: 5,
      prescribed_reps_min: 6,
    });
  });
});

describe('firstCreatedWorkoutToActivate', () => {
  it('activates only the first id when delivery is assign', () => {
    expect(firstCreatedWorkoutToActivate('assign', ['a', 'b'])).toBe('a');
    expect(firstCreatedWorkoutToActivate('schedule', ['a'])).toBeNull();
    expect(firstCreatedWorkoutToActivate('assign', [])).toBeNull();
  });
});
