import { describe, expect, it } from 'vitest';
import {
  findSetLog,
  formatSessionSummary,
  formatSetValue,
  toPreviousSessions,
  type PreviousLog,
} from '@/lib/exerciseHistory';

const log = (set_number: number, reps: number | null, weight: number | null = null, seconds: number | null = null): PreviousLog => ({
  set_number,
  reps_completed: reps,
  weight_used: weight,
  duration_seconds: seconds,
});

describe('formatSetValue', () => {
  it('mostra reps e carico', () => {
    expect(formatSetValue(log(1, 10, 20))).toBe('10 reps @ 20 kg');
    expect(formatSetValue(log(1, 8, 22.5))).toBe('8 reps @ 22,5 kg');
    expect(formatSetValue(log(1, 0, null, 45))).toBe('45s');
    expect(formatSetValue(null)).toBe('—');
  });
});

describe('formatSessionSummary', () => {
  it('elenca le reps per serie con carico uguale', () => {
    expect(formatSessionSummary([log(2, 10, 20), log(1, 10, 20), log(3, 8, 20)])).toBe('10 · 10 · 8 reps · 20 kg');
  });

  it('carico diverso: mostra il massimo', () => {
    expect(formatSessionSummary([log(1, 10, 20), log(2, 8, 25)])).toBe('10 · 8 reps · fino a 25 kg');
  });

  it('esercizi a tempo', () => {
    expect(formatSessionSummary([log(1, 0, null, 30), log(2, null, null, 25)])).toBe('30 · 25s');
  });

  it('protocolli: totale reps dal dettaglio per esercizio', () => {
    const protocolLog: PreviousLog = {
      ...log(1, 17),
      protocol_results: {
        version: 1,
        protocol: 'SUPERSET',
        entries: [
          { round: 1, exercise_index: 0, name: 'A', mode: 'reps', target: 10, done: 9 },
          { round: 1, exercise_index: 1, name: 'B', mode: 'reps', target: 8, done: 8 },
        ],
      },
    };
    expect(formatSessionSummary([protocolLog])).toBe('17 reps totali');
  });
});

describe('toPreviousSessions', () => {
  it('scarta le sessioni senza log e limita il numero', () => {
    const rows = [
      { id: 'w1', title: 'A', completed_at: '2026-09-29', workout_exercises: [{ workout_logs: [log(1, 10)] }] },
      { id: 'w2', title: 'A', completed_at: '2026-09-28', workout_exercises: [{ workout_logs: [] }] },
      { id: 'w3', title: 'A', completed_at: '2026-09-27', workout_exercises: [{ workout_logs: [log(1, 9)] }] },
      { id: 'w4', title: 'A', completed_at: '2026-09-26', workout_exercises: [{ workout_logs: [log(1, 8)] }] },
    ];
    const sessions = toPreviousSessions(rows, 2);
    expect(sessions.map((s) => s.workoutId)).toEqual(['w1', 'w3']);
    expect(findSetLog(sessions[0].logs, 1)?.reps_completed).toBe(10);
    expect(findSetLog(sessions[0].logs, 2)).toBeNull();
  });
});
