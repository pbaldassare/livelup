import { describe, expect, it } from 'vitest';
import {
  applyExerciseSearch,
  exerciseNameOrCategoryIlike,
  exerciseSearchRank,
  groupExercisesByCategory,
  matchesExerciseSearch,
} from '@/lib/exerciseSearch';

const rows = [
  { name: 'Chin up', category: 'Pull up', muscle_groups: ['Schiena'] },
  { name: 'Pull up arch', category: 'Pull up', muscle_groups: ['Schiena'] },
  { name: 'Dip bar', category: 'Dip', muscle_groups: ['Tricipiti'] },
  { name: 'Cable pull down', category: 'Legs', muscle_groups: ['Schiena'] },
  { name: 'Hollow hold', category: 'Core', muscle_groups: ['Addominali'] },
];

describe('matchesExerciseSearch', () => {
  it('matches category even when the name is different', () => {
    expect(matchesExerciseSearch('pull', { name: 'Chin up', category: 'Pull up' })).toBe(true);
    expect(matchesExerciseSearch('core', { name: 'Hollow hold', category: 'Core' })).toBe(true);
  });

  it('matches name and muscle groups', () => {
    expect(matchesExerciseSearch('chin', rows[0])).toBe(true);
    expect(matchesExerciseSearch('addom', rows[4])).toBe(true);
  });
});

describe('applyExerciseSearch', () => {
  it('puts the matching category family first, then name hits, then the rest', () => {
    const ranked = applyExerciseSearch('pull', rows);
    expect(ranked.map((r) => r.name)).toEqual([
      'Chin up',
      'Pull up arch',
      'Cable pull down',
    ]);
    expect(exerciseSearchRank('pull', ranked[0])).toBe(0);
    expect(exerciseSearchRank('pull', ranked[2])).toBeGreaterThan(0);
  });

  it('groups ranked hits by category in list order', () => {
    const groups = groupExercisesByCategory(applyExerciseSearch('pull', rows));
    expect(groups.map((g) => g.category)).toEqual(['Pull up', 'Legs']);
    expect(groups[0].items.map((i) => i.name)).toEqual(['Chin up', 'Pull up arch']);
  });

  it('without a query sorts by archive category then name', () => {
    const ranked = applyExerciseSearch('', rows);
    expect(ranked.map((r) => r.category)).toEqual(['Core', 'Dip', 'Legs', 'Pull up', 'Pull up']);
  });
});

describe('exerciseNameOrCategoryIlike', () => {
  it('builds a PostgREST or filter and strips reserved chars', () => {
    expect(exerciseNameOrCategoryIlike('pull')).toBe('name.ilike.%pull%,category.ilike.%pull%');
    expect(exerciseNameOrCategoryIlike('a,b')).toBe('name.ilike.%a b%,category.ilike.%a b%');
  });
});
