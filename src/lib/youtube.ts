// =====================================================
// Helpers YouTube (ID, embed, thumbnail, validazione URL)
// =====================================================

export const YOUTUBE_ATTACHMENT_TYPE = 'video/youtube';

const YOUTUBE_ID_RE =
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&?/\s]+)/i;

export function getYouTubeVideoId(url: string): string | null {
  if (!url?.trim()) return null;
  const match = url.trim().match(YOUTUBE_ID_RE);
  return match?.[1] ?? null;
}

export function isYouTubeUrl(url: string): boolean {
  return !!getYouTubeVideoId(url);
}

export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/** Embed URL; per chat preferire controls on e no autoplay. */
export function getYouTubeEmbedUrl(
  videoId: string,
  opts?: { autoplay?: boolean; mute?: boolean; loop?: boolean; controls?: boolean },
): string {
  const autoplay = opts?.autoplay ? 1 : 0;
  const mute = opts?.mute === false ? 0 : opts?.autoplay ? 1 : 0;
  const loop = opts?.loop ? 1 : 0;
  const controls = opts?.controls === false ? 0 : 1;
  const params = new URLSearchParams({
    autoplay: String(autoplay),
    mute: String(mute),
    controls: String(controls),
    modestbranding: '1',
    rel: '0',
    playsinline: '1',
  });
  if (loop) {
    params.set('loop', '1');
    params.set('playlist', videoId);
  }
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

/**
 * Se il testo è (quasi) solo un link YouTube, restituisce l'URL; altrimenti null.
 * Utile per auto-detect in invio messaggio.
 */
export function extractPrimaryYouTubeUrl(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const tokens = trimmed.split(/\s+/);
  if (tokens.length === 1 && getYouTubeVideoId(tokens[0])) {
    return tokens[0];
  }
  return null;
}

export function isYouTubeAttachmentType(type: string | null | undefined): boolean {
  return type === YOUTUBE_ATTACHMENT_TYPE || type === 'youtube';
}
