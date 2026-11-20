import { describe, expect, it } from 'vitest';
import {
  exerciseNameOrFilter,
  exerciseSearchRank,
  filterAndRankExercises,
  normalizeExerciseText,
} from '../exerciseSearch';

describe('exerciseSearch', () => {
  it('treats pull up, pull-up and pullup as the same text', () => {
    expect(normalizeExerciseText('Pull-up')).toBe('pull up');
    expect(normalizeExerciseText('PULLUP')).toBe('pullup');
    expect(exerciseSearchRank('ARCHER PULLUP', 'Pull up')).not.toBeNull();
    expect(exerciseSearchRank('COMMANDO PULLUPS', 'pull up')).not.toBeNull();
  });

  it('ranks the Pull up family before names that only contain the words', () => {
    const ranked = filterAndRankExercises(
      [
        { name: 'Bar muscle up · Chest To Bar Pull Ups' },
        { name: 'Front lever · Advanced Pull Up' },
        { name: 'Front lever · Full Pull Up' },
        { name: 'Pull up · Australian' },
        { name: 'Pull up' },
        { name: 'Oap · Archer Pull Up' },
      ],
      'Pull up',
    ).map((row) => row.name);

    expect(ranked[0]).toBe('Pull up');
    expect(ranked[1]).toBe('Pull up · Australian');
    expect(ranked.indexOf('Bar muscle up · Chest To Bar Pull Ups')).toBeGreaterThan(
      ranked.indexOf('Pull up · Australian'),
    );
  });

  it('builds an or-filter covering spaced and glued names', () => {
    const filter = exerciseNameOrFilter('Pull up');
    expect(filter).toContain('name.ilike.%Pull up%');
    expect(filter).toContain('name.ilike.%pull up%');
    expect(filter).toContain('name.ilike.%pull-up%');
    expect(filter).toContain('name.ilike.%pullup%');
  });
});
