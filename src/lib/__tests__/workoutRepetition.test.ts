import { describe, expect, it } from 'vitest';
import { generateWorkoutRepetitionDates } from '@/lib/workoutRepetition';

const d = (iso: string) => new Date(`${iso}T12:00:00`);

describe('generateWorkoutRepetitionDates', () => {
  it('returns only the start date for once', () => {
    const dates = generateWorkoutRepetitionDates({
      mode: 'once',
      startDate: d('2026-08-27'),
    });
    expect(dates).toHaveLength(1);
    expect(dates[0].getDate()).toBe(27);
  });

  it('places N total sessions on consecutive days without an end date', () => {
    const dates = generateWorkoutRepetitionDates({
      mode: 'total',
      startDate: d('2026-08-27'),
      totalCount: 3,
    });
    expect(dates.map((x) => x.getDate())).toEqual([27, 28, 29]);
  });

  it('spreads N total sessions between start and end', () => {
    const dates = generateWorkoutRepetitionDates({
      mode: 'total',
      startDate: d('2026-08-01'),
      endDate: d('2026-08-10'),
      totalCount: 3,
    });
    expect(dates).toHaveLength(3);
    expect(dates[0].getDate()).toBe(1);
    expect(dates[2].getDate()).toBe(10);
  });

  it('places 3 sessions per week without pinning weekdays', () => {
    const dates = generateWorkoutRepetitionDates({
      mode: 'weekly_count',
      startDate: d('2026-08-27'),
      timesPerWeek: 3,
      endDate: d('2026-09-09'),
    });
    expect(dates.length).toBeGreaterThanOrEqual(6);
    const firstThreeSpan =
      (dates[2].getTime() - dates[0].getTime()) / (24 * 60 * 60 * 1000);
    expect(firstThreeSpan).toBeLessThan(7);
  });
});
