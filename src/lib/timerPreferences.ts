import { safeGet, safeSet } from '@/lib/safeStorage';

const STORAGE_KEY = 'livelapp-timer-signals';

export type TimerIntensity = 'low' | 'medium' | 'high';
export type TimerLeadSeconds = 3 | 5 | 8;

export type TimerPreferences = {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  /** Quanto sono forti beep e vibrazione. Default high: più continui e intensi. */
  intensity: TimerIntensity;
  /** Secondi prima della fine in cui gli avvisi restano attivi. */
  leadSeconds: TimerLeadSeconds;
};

export const DEFAULT_TIMER_PREFERENCES: TimerPreferences = {
  soundEnabled: true,
  vibrationEnabled: true,
  intensity: 'high',
  leadSeconds: 5,
};

const INTENSITIES: TimerIntensity[] = ['low', 'medium', 'high'];
const LEADS: TimerLeadSeconds[] = [3, 5, 8];

export function isTimerIntensity(value: unknown): value is TimerIntensity {
  return typeof value === 'string' && INTENSITIES.includes(value as TimerIntensity);
}

export function isTimerLeadSeconds(value: unknown): value is TimerLeadSeconds {
  return typeof value === 'number' && LEADS.includes(value as TimerLeadSeconds);
}

export function parseTimerPreferences(raw: string | null): TimerPreferences {
  if (!raw) return { ...DEFAULT_TIMER_PREFERENCES };
  try {
    const parsed = JSON.parse(raw) as Partial<TimerPreferences>;
    return {
      soundEnabled: parsed.soundEnabled !== false,
      vibrationEnabled: parsed.vibrationEnabled !== false,
      intensity: isTimerIntensity(parsed.intensity)
        ? parsed.intensity
        : DEFAULT_TIMER_PREFERENCES.intensity,
      leadSeconds: isTimerLeadSeconds(parsed.leadSeconds)
        ? parsed.leadSeconds
        : DEFAULT_TIMER_PREFERENCES.leadSeconds,
    };
  } catch {
    return { ...DEFAULT_TIMER_PREFERENCES };
  }
}

export function getTimerPreferences(): TimerPreferences {
  return parseTimerPreferences(safeGet(STORAGE_KEY));
}

export function setTimerPreferences(next: Partial<TimerPreferences>) {
  const merged = { ...getTimerPreferences(), ...next };
  safeSet(STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

export function timerPulseIntervalMs(intensity: TimerIntensity): number {
  if (intensity === 'high') return 260;
  if (intensity === 'medium') return 420;
  return 640;
}

export function isInTimerWarningWindow(secondsLeft: number, leadSeconds: number): boolean {
  return secondsLeft > 0 && secondsLeft <= leadSeconds;
}
