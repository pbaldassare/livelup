import { useCallback } from 'react';

interface UseAdvanceExerciseOptions {
  exerciseIndex: number;
  exercises: Array<{ id: string }>;
  skipped: Record<string, boolean>;
  onFinish: () => void;
  onGoToNext: (nextIndex: number) => void;
}

/**
 * After a single-log protocol (EMOM, HIIT/TABATA) completes, advance to the
 * next non-skipped exercise or finish the workout.
 */
export function useAdvanceExercise({
  exerciseIndex,
  exercises,
  skipped,
  onFinish,
  onGoToNext,
}: UseAdvanceExerciseOptions) {
  return useCallback(() => {
    if (exerciseIndex >= exercises.length - 1) {
      onFinish();
      return;
    }

    let nextIdx = exerciseIndex + 1;
    while (nextIdx < exercises.length && skipped[exercises[nextIdx].id]) {
      nextIdx++;
    }

    if (nextIdx >= exercises.length) {
      onFinish();
      return;
    }

    onGoToNext(nextIdx);
  }, [exerciseIndex, exercises, skipped, onFinish, onGoToNext]);
}
