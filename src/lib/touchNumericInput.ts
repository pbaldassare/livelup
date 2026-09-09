// =====================================================
// Draft numerico per input touch: permette campo vuoto
// mentre si scrive; il commit avviene su blur / stepper.
// =====================================================

export function sanitizeIntegerInput(raw: string): string {
  return raw.replace(/\D/g, '');
}

function clampInt(n: number, min: number, max?: number): number {
  let next = Math.max(min, Math.floor(n));
  if (typeof max === 'number' && Number.isFinite(max)) {
    next = Math.min(max, next);
  }
  return next;
}

export function commitPositiveInt(
  raw: string,
  fallback: number,
  min = 1,
  max?: number,
): number {
  const trimmed = raw.trim();
  if (trimmed === '') return clampInt(fallback, min, max);
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return clampInt(fallback, min, max);
  return clampInt(n, min, max);
}

export function stepPositiveInt(
  current: number | null | undefined,
  delta: number,
  min = 1,
  max?: number,
): number {
  const base =
    typeof current === 'number' && Number.isFinite(current) ? Math.floor(current) : min;
  return clampInt(base + delta, min, max);
}

export function formatCommittedInt(value: number | null | undefined): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(Math.floor(value));
  return '';
}
