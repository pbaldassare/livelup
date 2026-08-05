/**
 * Media esercizi: URL video di default e risoluzione per-esercizio.
 * Il PT/admin può sovrascrivere `exercises.video_url` per ciascun esercizio.
 */

/** Demo YouTube usata come fallback globale (pull-up / bodyweight). */
export const DEFAULT_EXERCISE_VIDEO_URL =
  'https://www.youtube.com/watch?v=eGo4IYlbE5g';

export function resolveExerciseVideoUrl(
  videoUrl?: string | null,
  opts?: { allowDefault?: boolean },
): string | undefined {
  const trimmed = videoUrl?.trim();
  if (trimmed) return trimmed;
  if (opts?.allowDefault === false) return undefined;
  return DEFAULT_EXERCISE_VIDEO_URL;
}
