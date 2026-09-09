import { describe, expect, it } from 'vitest';
import {
  canAddRoutineExercise,
  resolveRoutineExerciseIds,
  routineExerciseListPatch,
} from '@/lib/pt/routineExercises';

describe('resolveRoutineExerciseIds', () => {
  it('preferisce l’array e toglie i duplicati', () => {
    expect(
      resolveRoutineExerciseIds({
        exerciseIds: ['a', 'b', 'a', ''],
        exerciseId: 'legacy',
      }),
    ).toEqual(['a', 'b']);
  });

  it('usa il singolo id legacy se l’array è vuoto', () => {
    expect(
      resolveRoutineExerciseIds({
        exerciseIds: [],
        exerciseId: 'legacy',
      }),
    ).toEqual(['legacy']);
  });

  it('restituisce lista vuota senza sorgenti', () => {
    expect(resolveRoutineExerciseIds({})).toEqual([]);
  });
});

describe('routineExerciseListPatch', () => {
  it('sincronizza lista, id legacy e azzera il template', () => {
    expect(routineExerciseListPatch('warmup', ['e1', 'e2'])).toEqual({
      include_warmup: true,
      warmup_template_id: null,
      warmup_exercise_ids: ['e1', 'e2'],
      warmup_exercise_id: 'e1',
    });
  });

  it('con lista vuota azzera anche il legacy', () => {
    expect(routineExerciseListPatch('cooldown', [])).toMatchObject({
      include_cooldown: true,
      cooldown_template_id: null,
      cooldown_exercise_ids: [],
      cooldown_exercise_id: null,
    });
  });
});

describe('canAddRoutineExercise', () => {
  it('rifiuta duplicati e id vuoti', () => {
    expect(canAddRoutineExercise(['a'], 'a')).toBe(false);
    expect(canAddRoutineExercise(['a'], '')).toBe(false);
    expect(canAddRoutineExercise(['a'], 'b')).toBe(true);
  });
});
