import { describe, expect, it } from 'vitest';
import {
  deadlineFromRemaining,
  elapsedFromStart,
  remainingFromDeadline,
  shiftDeadline,
} from '@/lib/workoutClock';

describe('workoutClock', () => {
  const now = 1_000_000;

  it('calcola la scadenza e i secondi rimanenti', () => {
    const ends = deadlineFromRemaining(90, now);
    expect(ends).toBe(now + 90_000);
    expect(remainingFromDeadline(ends, now)).toBe(90);
    expect(remainingFromDeadline(ends, now + 51_200)).toBe(39);
    expect(remainingFromDeadline(ends, now + 90_000)).toBe(0);
    expect(remainingFromDeadline(ends, now + 120_000)).toBe(0);
  });

  it('dopo un blocco schermo salta i secondi persi', () => {
    const ends = deadlineFromRemaining(60, now);
    expect(remainingFromDeadline(ends, now + 40_000)).toBe(20);
  });

  it('±15s sposta la scadenza, non un tick congelato', () => {
    const ends = deadlineFromRemaining(51, now);
    const plus = shiftDeadline(ends, 15, { minRemaining: 5, now });
    expect(remainingFromDeadline(plus, now)).toBe(66);
    const minus = shiftDeadline(ends, -15, { minRemaining: 5, now });
    expect(remainingFromDeadline(minus, now)).toBe(36);
  });

  it('elapsed di sessione usa l’orologio, non i tick', () => {
    expect(elapsedFromStart(now, now + 125_000)).toBe(125);
  });
});
