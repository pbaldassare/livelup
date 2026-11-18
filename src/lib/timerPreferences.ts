import { safeGet, safeSet } from '@/lib/safeStorage';

const STORAGE_KEY = 'livelapp-timer-signals';

export type TimerPreferences = {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
};

const DEFAULTS: TimerPreferences = {
  soundEnabled: true,
  vibrationEnabled: true,
};

export function getTimerPreferences(): TimerPreferences {
  const raw = safeGet(STORAGE_KEY);
  if (!raw) return { ...DEFAULTS };
  try {
    const parsed = JSON.parse(raw) as Partial<TimerPreferences>;
    return {
      soundEnabled: parsed.soundEnabled !== false,
      vibrationEnabled: parsed.vibrationEnabled !== false,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setTimerPreferences(next: Partial<TimerPreferences>) {
  const merged = { ...getTimerPreferences(), ...next };
  safeSet(STORAGE_KEY, JSON.stringify(merged));
}