/**
 * Media esercizi: URL video di default e risoluzione per-esercizio.
 * Il PT/admin può sovrascrivere `exercises.video_url` per ciascun esercizio.
 */

/** Demo YouTube usata come fallback globale (pull-up / bodyweight). */
export const DEFAULT_EXERCISE_VIDEO_URL =
  'https://www.youtube.com/watch?v=eGo4IYlbE5g';

/**
 * MP4 del catalogo Drive (274 esercizi pubblici `Cartella · Variante`).
 * I file stanno sul Cloud ufficiale Livelapp; gli ID coincidono anche sul
 * Cloud precedente, dove `video_url` non è stato scritto.
 */
export const CATALOG_DRIVE_VIDEO_BASE =
  'https://kxgaqnksylntokyrpaxp.supabase.co/storage/v1/object/public/exercise-videos/0751d120-a47d-44b8-9262-75e5be4726c8';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPublicCatalogExerciseName(name?: string | null): boolean {
  return typeof name === 'string' && name.includes(' · ');
}

export function catalogDriveVideoUrl(exerciseId: string): string {
  return `${CATALOG_DRIVE_VIDEO_BASE}/${exerciseId}/demo.mp4`;
}

export function resolveCatalogDriveVideoUrl(
  exerciseId?: string | null,
  exerciseName?: string | null,
): string | undefined {
  const id = exerciseId?.trim();
  if (!id || !UUID_RE.test(id)) return undefined;
  if (!isPublicCatalogExerciseName(exerciseName)) return undefined;
  return catalogDriveVideoUrl(id);
}

export function resolveExerciseVideoUrl(
  videoUrl?: string | null,
  opts?: {
    allowDefault?: boolean;
    exerciseId?: string | null;
    exerciseName?: string | null;
  },
): string | undefined {
  const trimmed = videoUrl?.trim();
  if (trimmed) return trimmed;

  const catalogUrl = resolveCatalogDriveVideoUrl(opts?.exerciseId, opts?.exerciseName);
  if (catalogUrl) return catalogUrl;

  if (opts?.allowDefault === false) return undefined;
  return DEFAULT_EXERCISE_VIDEO_URL;
}
