import { describe, expect, it } from 'vitest';
import {
  isInTimerWarningWindow,
  parseTimerPreferences,
  timerPulseIntervalMs,
} from '@/lib/timerPreferences';
import { timerBeepSpec, timerVibrationSpec } from '@/lib/timerEndSignals';

describe('parseTimerPreferences', () => {
  it('defaults to high intensity and 5s lead', () => {
    expect(parseTimerPreferences(null)).toEqual({
      soundEnabled: true,
      vibrationEnabled: true,
      intensity: 'high',
      leadSeconds: 5,
    });
  });

  it('keeps on/off flags from stored json', () => {
    expect(
      parseTimerPreferences(
        JSON.stringify({ soundEnabled: false, vibrationEnabled: true, intensity: 'low', leadSeconds: 8 }),
      ),
    ).toEqual({
      soundEnabled: false,
      vibrationEnabled: true,
      intensity: 'low',
      leadSeconds: 8,
    });
  });
});

describe('timer warning window', () => {
  it('is active only in the last N seconds', () => {
    expect(isInTimerWarningWindow(6, 5)).toBe(false);
    expect(isInTimerWarningWindow(5, 5)).toBe(true);
    expect(isInTimerWarningWindow(1, 5)).toBe(true);
    expect(isInTimerWarningWindow(0, 5)).toBe(false);
  });

  it('pulses faster at high intensity', () => {
    expect(timerPulseIntervalMs('high')).toBeLessThan(timerPulseIntervalMs('medium'));
    expect(timerPulseIntervalMs('medium')).toBeLessThan(timerPulseIntervalMs('low'));
  });
});

describe('signal intensity', () => {
  it('uses louder longer beeps on high vs low', () => {
    const high = timerBeepSpec('rest', 1, 'high');
    const low = timerBeepSpec('rest', 1, 'low');
    expect(high.gain).toBeGreaterThan(low.gain);
    expect(high.durationMs).toBeGreaterThan(low.durationMs);
    expect(high.type).toBe('square');
  });

  it('uses a denser vibration pattern in the last second at high', () => {
    const last = timerVibrationSpec(1, 'high');
    const earlier = timerVibrationSpec(4, 'high');
    expect(last.length).toBeGreaterThan(earlier.length);
  });
});
