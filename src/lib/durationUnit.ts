// =====================================================
// Conversione durata min ↔ sec per editor PT.
// Storage canonico: secondi. Unità minuti è solo display.
// TouchIntegerInput è intero: in minuti i secondi residui
// scattano al minuto più vicino (90s → 2 min → 120s).
// =====================================================

export type DurationUnit = 'min' | 'sec';

export function secondsToUnitDisplay(
  seconds: number | null | undefined,
  unit: DurationUnit,
): number | null {
  if (seconds == null || !Number.isFinite(seconds)) return null;
  const safe = Math.max(0, Math.round(Number(seconds)));
  if (unit === 'sec') return safe;
  const minutes = Math.round(safe / 60);
  if (safe > 0 && minutes < 1) return 1;
  return minutes;
}

export function unitValueToSeconds(unit: DurationUnit, value: number, minSeconds = 0): number {
  if (!Number.isFinite(value)) return Math.max(0, minSeconds);
  const n = Math.round(value);
  const seconds = unit === 'min' ? Math.max(0, n) * 60 : Math.max(0, n);
  return Math.max(minSeconds, seconds);
}

/** Se si passa a minuti e i secondi non sono multipli di 60, snap al minuto più vicino. */
export function secondsAfterUnitSwitch(
  seconds: number | null | undefined,
  nextUnit: DurationUnit,
  minSeconds = 0,
): number | null {
  if (seconds == null || !Number.isFinite(seconds)) return seconds ?? null;
  if (nextUnit === 'sec') return Math.max(minSeconds, Math.round(seconds));
  const display = secondsToUnitDisplay(seconds, 'min');
  if (display == null) return null;
  return unitValueToSeconds('min', display, minSeconds);
}

export function formatDurationClock(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function minDisplayForUnit(unit: DurationUnit, minSeconds: number): number {
  if (unit === 'sec') return Math.max(0, minSeconds);
  if (minSeconds <= 0) return 0;
  return Math.max(1, Math.ceil(minSeconds / 60));
}

export function stepForUnit(unit: DurationUnit, stepSeconds: number): number {
  return unit === 'min' ? 1 : Math.max(1, Math.floor(stepSeconds));
}

export function isDurationSecondsFieldKey(key: string): boolean {
  return (
    key === 'duration_seconds' ||
    key === 'exercise_duration_seconds' ||
    key === 'work_seconds' ||
    key === 'interval_seconds' ||
    key === 'round_duration'
  );
}

export function isDurationMinutesFieldKey(key: string): boolean {
  return key === 'duration_minutes';
}
