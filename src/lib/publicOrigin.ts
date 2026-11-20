/**
 * Origine dei link pubblici (invito atleta, email auth) che oggi serve
 * il frontend di GitHub `main`.
 *
 * `livelapp.iaconnect.it` punta ancora al CDN Lovable (bundle vecchio):
 * i link atleta devono usare Cloudflare Pages finché il DNS custom
 * non è attaccato al progetto `livelup`.
 */
export const PUBLIC_APP_ORIGIN = 'https://livelup.pages.dev'

const STALE_CUSTOM_HOSTS = new Set([
  'livelapp.iaconnect.it',
  'www.livelapp.iaconnect.it',
  'livelapp.it',
  'www.livelapp.it',
])

export function isDevOrPreviewHost(host: string): boolean {
  const h = host.trim().toLowerCase()
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '0.0.0.0' ||
    h.startsWith('id-preview--') ||
    h.startsWith('preview--') ||
    h.endsWith('.lovableproject.com') ||
    h.endsWith('.lovableproject-dev.com') ||
    h.endsWith('.lovable.dev') ||
    (h.endsWith('.pages.dev') && h !== 'livelup.pages.dev')
  )
}

export function resolvePublicAppOrigin(hostname: string, origin?: string | null): string {
  const canonical = PUBLIC_APP_ORIGIN.replace(/\/$/, '')
  const host = hostname.trim().toLowerCase()
  if (!host || isDevOrPreviewHost(host) || STALE_CUSTOM_HOSTS.has(host)) {
    return canonical
  }
  if (origin) return origin.replace(/\/$/, '')
  return canonical
}

export function publicAppOrigin(): string {
  if (typeof window === 'undefined') return PUBLIC_APP_ORIGIN
  return resolvePublicAppOrigin(window.location?.hostname ?? '', window.location?.origin)
}
