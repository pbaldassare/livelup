import { describe, expect, it } from 'vitest';
import {
  formatDurationClock,
  isDurationMinutesFieldKey,
  isDurationSecondsFieldKey,
  minDisplayForUnit,
  secondsAfterUnitSwitch,
  secondsToUnitDisplay,
  stepForUnit,
  unitValueToSeconds,
} from '@/lib/durationUnit';

describe('secondsToUnitDisplay', () => {
  it('mostra i secondi così come sono', () => {
    expect(secondsToUnitDisplay(90, 'sec')).toBe(90);
    expect(secondsToUnitDisplay(600, 'sec')).toBe(600);
  });

  it('mostra i minuti arrotondati (input intero)', () => {
    expect(secondsToUnitDisplay(600, 'min')).toBe(10);
    expect(secondsToUnitDisplay(90, 'min')).toBe(2);
    expect(secondsToUnitDisplay(45, 'min')).toBe(1);
    expect(secondsToUnitDisplay(29, 'min')).toBe(1);
  });

  it('restituisce null per valori vuoti', () => {
    expect(secondsToUnitDisplay(null, 'min')).toBeNull();
    expect(secondsToUnitDisplay(undefined, 'sec')).toBeNull();
  });
});

describe('unitValueToSeconds', () => {
  it('10 min → 600 secondi', () => {
    expect(unitValueToSeconds('min', 10)).toBe(600);
  });

  it('90 sec → 90 secondi', () => {
    expect(unitValueToSeconds('sec', 90)).toBe(90);
  });

  it('rispetta il minimo in secondi', () => {
    expect(unitValueToSeconds('sec', 3, 10)).toBe(10);
    expect(unitValueToSeconds('min', 0, 10)).toBe(10);
  });
});

describe('secondsAfterUnitSwitch', () => {
  it('verso sec lascia i secondi invariati', () => {
    expect(secondsAfterUnitSwitch(90, 'sec')).toBe(90);
  });

  it('verso min snap al minuto più vicino se non è multiplo di 60', () => {
    expect(secondsAfterUnitSwitch(90, 'min')).toBe(120);
    expect(secondsAfterUnitSwitch(45, 'min')).toBe(60);
    expect(secondsAfterUnitSwitch(600, 'min')).toBe(600);
  });
});

describe('formatDurationClock / steps', () => {
  it('formatta MM:SS', () => {
    expect(formatDurationClock(600)).toBe('10:00');
    expect(formatDurationClock(90)).toBe('1:30');
  });

  it('step minuti = 1, secondi come oggi', () => {
    expect(stepForUnit('min', 30)).toBe(1);
    expect(stepForUnit('sec', 30)).toBe(30);
    expect(stepForUnit('sec', 5)).toBe(5);
  });

  it('minimo display in minuti è almeno 1 se minSeconds > 0', () => {
    expect(minDisplayForUnit('min', 10)).toBe(1);
    expect(minDisplayForUnit('sec', 10)).toBe(10);
  });
});

describe('field key helpers', () => {
  it('riconosce i campi durata, non il recupero', () => {
    expect(isDurationSecondsFieldKey('duration_seconds')).toBe(true);
    expect(isDurationSecondsFieldKey('exercise_duration_seconds')).toBe(true);
    expect(isDurationSecondsFieldKey('rest_seconds')).toBe(false);
    expect(isDurationMinutesFieldKey('duration_minutes')).toBe(true);
    expect(isDurationMinutesFieldKey('duration_seconds')).toBe(false);
  });
});
