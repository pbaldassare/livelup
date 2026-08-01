import ptDashboard from '@/assets/marketing/pt-athletes-dashboard.png';
import ptBuilder from '@/assets/marketing/pt-template-builder.png';
import atletaPlayer from '@/assets/marketing/atleta-workout-player.png';

const FALLBACKS = [ptDashboard, ptBuilder, atletaPlayer];

/** Cover ufficiale del post, oppure immagine marketing di fallback stabile per id. */
export function resolveBlogCoverUrl(
  coverUrl: string | null | undefined,
  seed: string,
): string {
  if (coverUrl?.trim()) return coverUrl.trim();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return FALLBACKS[hash % FALLBACKS.length];
}
