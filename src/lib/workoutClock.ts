/** Timer di allenamento ancorati all'orologio di sistema (sopravvivono al blocco schermo). */

export function deadlineFromRemaining(remainingSeconds: number, now = Date.now()): number {
  return now + Math.max(0, remainingSeconds) * 1000;
}

export function remainingFromDeadline(endsAtMs: number | null | undefined, now = Date.now()): number {
  if (endsAtMs == null) return 0;
  return Math.max(0, Math.ceil((endsAtMs - now) / 1000));
}

export function elapsedFromStart(startedAtMs: number | null | undefined, now = Date.now()): number {
  if (startedAtMs == null) return 0;
  return Math.max(0, Math.floor((now - startedAtMs) / 1000));
}

export function shiftDeadline(
  endsAtMs: number | null | undefined,
  deltaSeconds: number,
  opts?: { minRemaining?: number; now?: number },
): number {
  const now = opts?.now ?? Date.now();
  const minRemaining = opts?.minRemaining ?? 0;
  const current = remainingFromDeadline(endsAtMs, now);
  const next = Math.max(minRemaining, current + deltaSeconds);
  return deadlineFromRemaining(next, now);
}
