export const MAX_WORKOUT_REPEATS = 60;

/** Marker in colonne già note all'API: target e progresso restano leggibili anche senza cache repeat_*. */
export const REPEAT_TARGET_MARKER_RE = /<!--livelapp-repeat:(\d+)-->/;
export const REPEAT_DONE_MARKER_RE = /<!--livelapp-repeat-done:(\d+)-->/;
export const REPEAT_TICK_MARKER = '<!--livelapp-repeat-tick-->';

export type RepeatSource = {
  repeat_target?: number | null;
  repeat_done?: number | null;
  description?: string | null;
  notes_atleta?: string | null;
};

export function parseRepeatTargetMarker(text: string | null | undefined): number | null {
  const m = (text ?? '').match(REPEAT_TARGET_MARKER_RE);
  if (!m) return null;
  return clampRepeatTarget(m[1]);
}

export function parseRepeatDoneMarker(text: string | null | undefined): number | null {
  const m = (text ?? '').match(REPEAT_DONE_MARKER_RE);
  if (!m) return null;
  const n = Math.floor(Number(m[1]));
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/** Toglie i marker interni prima di mostrare description/note in UI. */
export function stripRepeatMarkers(text: string | null | undefined): string {
  return (text ?? '')
    .replace(REPEAT_TARGET_MARKER_RE, '')
    .replace(REPEAT_DONE_MARKER_RE, '')
    .split(REPEAT_TICK_MARKER)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

export function encodeRepeatDescription(
  description: string | null | undefined,
  repeatTarget: unknown,
): string | null {
  const target = clampRepeatTarget(repeatTarget);
  const body = stripRepeatMarkers(description);
  if (target <= 1) return body || null;
  return body ? `<!--livelapp-repeat:${target}--> ${body}` : `<!--livelapp-repeat:${target}-->`;
}

export function encodeRepeatProgressNotes(
  notes: string | null | undefined,
  done: unknown,
  opts?: { tick?: boolean },
): string {
  const body = stripRepeatMarkers(notes);
  const n = Math.max(0, Math.floor(Number(done)) || 0);
  const parts: string[] = [];
  if (opts?.tick) parts.push(REPEAT_TICK_MARKER);
  if (n > 0) parts.push(`<!--livelapp-repeat-done:${n}-->`);
  if (body) parts.push(body);
  return parts.join(' ');
}

/** @deprecated usa encodeRepeatProgressNotes — tenuto per i test e i caller vecchi. */
export function encodeRepeatTickNotes(notes: string | null | undefined): string {
  return encodeRepeatProgressNotes(notes, 0, { tick: true });
}

/**
 * Target/fatte da colonne API se ci sono, altrimenti dai marker in description/note.
 * Il marker può alzare un target rimasto a 1 (default colonna).
 */
export function resolveRepeatState(row: RepeatSource | null | undefined): {
  repeatTarget: number;
  repeatDone: number;
} {
  const markerTarget = parseRepeatTargetMarker(row?.description);
  const colTarget = row?.repeat_target;
  const repeatTarget = clampRepeatTarget(
    Math.max(markerTarget ?? 1, typeof colTarget === 'number' ? colTarget : 1),
  );
  const markerDone = parseRepeatDoneMarker(row?.notes_atleta);
  const colDone = row?.repeat_done;
  const rawDone = Math.max(
    typeof colDone === 'number' && Number.isFinite(colDone) ? colDone : 0,
    markerDone ?? 0,
  );
  return {
    repeatTarget,
    repeatDone: normalizeRepeatDone(rawDone, repeatTarget),
  };
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
