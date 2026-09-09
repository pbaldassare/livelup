// =====================================================
// Riscaldamento / stretching: lista esercizi (oltre al singolo id legacy)
// =====================================================

const MAX_ROUTINE_EXERCISES = 20;

export function resolveRoutineExerciseIds(params: {
  exerciseIds?: unknown;
  exerciseId?: string | null;
}): string[] {
  const fromArray = Array.isArray(params.exerciseIds)
    ? params.exerciseIds.filter(
        (id): id is string => typeof id === 'string' && id.length > 0,
      )
    : [];
  const unique: string[] = [];
  for (const id of fromArray) {
    if (!unique.includes(id)) unique.push(id);
  }
  if (unique.length > 0) return unique.slice(0, MAX_ROUTINE_EXERCISES);
  if (params.exerciseId) return [params.exerciseId];
  return [];
}

export function routineExerciseListPatch(
  kind: 'warmup' | 'cooldown',
  ids: string[],
): Record<string, unknown> {
  const unique = resolveRoutineExerciseIds({ exerciseIds: ids });
  const includeKey = kind === 'warmup' ? 'include_warmup' : 'include_cooldown';
  const templateKey = kind === 'warmup' ? 'warmup_template_id' : 'cooldown_template_id';
  const legacyKey = kind === 'warmup' ? 'warmup_exercise_id' : 'cooldown_exercise_id';
  const listKey = kind === 'warmup' ? 'warmup_exercise_ids' : 'cooldown_exercise_ids';
  return {
    [includeKey]: true,
    [templateKey]: null,
    [listKey]: unique,
    [legacyKey]: unique[0] ?? null,
  };
}

export function canAddRoutineExercise(ids: string[], nextId: string): boolean {
  if (!nextId) return false;
  if (ids.includes(nextId)) return false;
  return ids.length < MAX_ROUTINE_EXERCISES;
}

export function nextRoutineOrderIndex(orders: number[]): number {
  if (orders.length === 0) return 0;
  return Math.max(...orders) + 1;
}

export { MAX_ROUTINE_EXERCISES };
