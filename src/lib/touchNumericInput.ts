// =====================================================
// Draft numerico per input touch: permette campo vuoto
// mentre si scrive; il commit avviene su blur / stepper.
// =====================================================

export function sanitizeIntegerInput(raw: string): string {
  return raw.replace(/\D/g, '');
}

export function commitPositiveInt(
  raw: string,
  fallback: number,
  min = 1,
): number {
  const trimmed = raw.trim();
  if (trimmed === '') return Math.max(min, fallback);
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return Math.max(min, fallback);
  return Math.max(min, Math.floor(n));
}

export function stepPositiveInt(
  current: number | null | undefined,
  delta: number,
  min = 1,
): number {
  const base =
    typeof current === 'number' && Number.isFinite(current) ? Math.floor(current) : min;
  return Math.max(min, base + delta);
}

export function formatCommittedInt(value: number | null | undefined): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(Math.floor(value));
  return '';
}
