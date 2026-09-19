import { describe, expect, it } from 'vitest';
import { generateWorkoutRepetitionDates, resolveAssignmentPlan } from '@/lib/workoutRepetition';
import {
  applyRepeatCompletion,
  canCreateWithoutRepeatColumns,
  encodeRepeatDescription,
  encodeRepeatProgressNotes,
  encodeRepeatTickNotes,
  formatRepeatCompletionToast,
  formatRepeatProgress,
  isRepeatColumnsMissingError,
  parseRepeatDoneMarker,
  parseRepeatTargetMarker,
  REPEAT_TICK_MARKER,
  resolveRepeatState,
  stripRepeatMarkers,
} from '@/lib/workoutRepeat';

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

describe('resolveAssignmentPlan', () => {
  it('N volte in totale: una sola data e il contatore', () => {
    const plan = resolveAssignmentPlan({
      mode: 'total',
      startDate: d('2026-09-19'),
      totalCount: 8,
    });
    expect(plan.dates).toHaveLength(1);
    expect(plan.dates[0].getDate()).toBe(19);
    expect(plan.repeatTarget).toBe(8);
  });

  it('una volta: una data e target 1', () => {
    const plan = resolveAssignmentPlan({
      mode: 'once',
      startDate: d('2026-09-19'),
    });
    expect(plan.dates).toHaveLength(1);
    expect(plan.repeatTarget).toBe(1);
  });

  it('N volte in totale ignora la data fine: resta una scheda', () => {
    const plan = resolveAssignmentPlan({
      mode: 'total',
      startDate: d('2026-09-01'),
      endDate: d('2026-09-30'),
      totalCount: 12,
    });
    expect(plan.dates).toHaveLength(1);
    expect(plan.repeatTarget).toBe(12);
  });

  it('N volte a settimana: N date e target 1', () => {
    const plan = resolveAssignmentPlan({
      mode: 'weekly_count',
      startDate: d('2026-08-27'),
      timesPerWeek: 3,
      endDate: d('2026-09-09'),
    });
    expect(plan.dates.length).toBeGreaterThan(1);
    expect(plan.repeatTarget).toBe(1);
  });
});

describe('applyRepeatCompletion', () => {
  it('incrementa e chiude al target', () => {
    expect(applyRepeatCompletion(0, 8)).toEqual({
      repeatDone: 1,
      repeatTarget: 8,
      finished: false,
    });
    expect(applyRepeatCompletion(7, 8)).toEqual({
      repeatDone: 8,
      repeatTarget: 8,
      finished: true,
    });
  });

  it('formatta fatte / da fare', () => {
    expect(formatRepeatProgress(2, 8)).toBe('2 / 8 volte');
  });

  it('toast intermedio vs chiusura ciclo', () => {
    expect(formatRepeatCompletionToast(3, 8).finished).toBe(false);
    expect(formatRepeatCompletionToast(3, 8).message).toContain('3 / 8');
    expect(formatRepeatCompletionToast(8, 8)).toEqual({
      finished: true,
      message: 'Allenamento completato! 🎉',
    });
  });

  it('codifica il marker N volte nella description', () => {
    expect(encodeRepeatDescription('ciao', 2)).toBe('<!--livelapp-repeat:2--> ciao');
    expect(encodeRepeatDescription(null, 1)).toBeNull();
    expect(encodeRepeatTickNotes('ok')).toBe(`${REPEAT_TICK_MARKER} ok`);
  });

  it('tiene target e fatte nei marker anche se le colonne API mancano', () => {
    expect(parseRepeatTargetMarker('<!--livelapp-repeat:2--> PROVA')).toBe(2);
    expect(parseRepeatDoneMarker(`${REPEAT_TICK_MARKER} <!--livelapp-repeat-done:2-->`)).toBe(2);
    expect(
      encodeRepeatProgressNotes('ok', 2, { tick: true }),
    ).toBe(`${REPEAT_TICK_MARKER} <!--livelapp-repeat-done:2--> ok`);
    expect(stripRepeatMarkers('<!--livelapp-repeat:2--> ciao')).toBe('ciao');
    expect(
      resolveRepeatState({
        repeat_target: 1,
        repeat_done: 0,
        description: '<!--livelapp-repeat:2--> PROVA',
        notes_atleta: '<!--livelapp-repeat-done:2-->',
      }),
    ).toEqual({ repeatTarget: 2, repeatDone: 2 });
    expect(
      resolveRepeatState({
        repeat_target: 2,
        repeat_done: 1,
        description: null,
        notes_atleta: null,
      }),
    ).toEqual({ repeatTarget: 2, repeatDone: 1 });
  });

  it('dopo N sessioni il ciclo è chiuso (niente seconda da fare)', () => {
    expect(applyRepeatCompletion(1, 2)).toEqual({
      repeatDone: 2,
      repeatTarget: 2,
      finished: true,
    });
    expect(formatRepeatCompletionToast(2, 2).finished).toBe(true);
  });

  it('non crea in silenzio una scheda una tantum se il target è N', () => {
    expect(canCreateWithoutRepeatColumns(1)).toBe(true);
    expect(canCreateWithoutRepeatColumns(8)).toBe(false);
    expect(isRepeatColumnsMissingError('Could not find the repeat_target column of workouts in the schema cache')).toBe(
      true,
    );
    expect(isRepeatColumnsMissingError('permission denied')).toBe(false);
  });
});
