import { describe, expect, it } from 'vitest';
import { canUnassignWorkout } from '@/lib/api/workouts';

describe('canUnassignWorkout', () => {
  it('allows programmed and in-progress assignments', () => {
    expect(canUnassignWorkout('attivo')).toBe(true);
    expect(canUnassignWorkout('scaduto')).toBe(true);
    expect(canUnassignWorkout('in_corso')).toBe(true);
    expect(canUnassignWorkout('in_sospeso')).toBe(true);
  });

  it('blocks completed history', () => {
    expect(canUnassignWorkout('completato')).toBe(false);
    expect(canUnassignWorkout('saltato')).toBe(false);
  });
});
