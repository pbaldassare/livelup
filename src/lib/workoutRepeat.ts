export const MAX_WORKOUT_REPEATS = 60;

/** Marker in colonne già note all'API: un trigger Postgres applica il contatore. */
export const REPEAT_TARGET_MARKER_RE = /<!--livelapp-repeat:(\d+)-->/;
export const REPEAT_TICK_MARKER = '<!--livelapp-repeat-tick-->';

export function encodeRepeatDescription(
  description: string | null | undefined,
  repeatTarget: unknown,
): string | null {
  const target = clampRepeatTarget(repeatTarget);
  const body = (description ?? '').replace(REPEAT_TARGET_MARKER_RE, '').trim();
  if (target <= 1) return body || null;
  return body ? `<!--livelapp-repeat:${target}--> ${body}` : `<!--livelapp-repeat:${target}-->`;
}

export function encodeRepeatTickNotes(notes: string | null | undefined): string {
  const body = (notes ?? '').split(REPEAT_TICK_MARKER).join('').trim();
  return body ? `${REPEAT_TICK_MARKER} ${body}` : REPEAT_TICK_MARKER;
}

/** PostgREST / Postgres quando le colonne repeat_* non sono (ancora) in cache. */
export const REPEAT_COLUMNS_MISSING_RE =
  /repeat_target|repeat_done|42703|PGRST204|schema cache/i;

export function isRepeatColumnsMissingError(message: unknown): boolean {
  return typeof message === 'string' && REPEAT_COLUMNS_MISSING_RE.test(message);
}

/** Fallback insert senza colonne solo se la scheda è una tantum. */
export function canCreateWithoutRepeatColumns(repeatTarget: unknown): boolean {
  return clampRepeatTarget(repeatTarget) <= 1;
}

export function clampRepeatTarget(value: unknown): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(MAX_WORKOUT_REPEATS, n);
}

export function normalizeRepeatDone(done: unknown, target: number): number {
  const t = clampRepeatTarget(target);
  const n = Math.floor(Number(done));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(t, n);
}

/** Una sessione registrata: incrementa fatte e dice se il ciclo è chiuso. */
export function applyRepeatCompletion(done: unknown, target: unknown): {
  repeatDone: number;
  repeatTarget: number;
  finished: boolean;
} {
  const repeatTarget = clampRepeatTarget(target);
  const current = normalizeRepeatDone(done, repeatTarget);
  const repeatDone = Math.min(repeatTarget, current + 1);
  return {
    repeatDone,
    repeatTarget,
    finished: repeatDone >= repeatTarget,
  };
}

export function isRepeatAssignment(target: unknown): boolean {
  return clampRepeatTarget(target) > 1;
}

export function formatRepeatProgress(done: unknown, target: unknown): string {
  const repeatTarget = clampRepeatTarget(target);
  const repeatDone = normalizeRepeatDone(done, repeatTarget);
  return `${repeatDone} / ${repeatTarget} volte`;
}

export function formatRepeatCompletionToast(done: unknown, target: unknown): {
  finished: boolean;
  message: string;
} {
  const repeatTarget = clampRepeatTarget(target);
  const repeatDone = normalizeRepeatDone(done, repeatTarget);
  const finished = repeatTarget <= 1 || repeatDone >= repeatTarget;
  if (finished) {
    return { finished: true, message: 'Allenamento completato! 🎉' };
  }
  const remaining = repeatTarget - repeatDone;
  return {
    finished: false,
    message:
      remaining === 1
        ? `Sessione ${repeatDone} / ${repeatTarget} registrata. Ne resta 1.`
        : `Sessione ${repeatDone} / ${repeatTarget} registrata. Ne restano ${remaining}.`,
  };
}
