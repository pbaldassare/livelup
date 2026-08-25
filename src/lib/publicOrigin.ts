/** Origine usata nei link email (reset, conferma) quando si è su localhost o preview. */
export const PUBLIC_APP_ORIGIN = 'https://livelapp.iaconnect.it'

function isNonPublicHost(host: string): boolean {
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host.startsWith('id-preview--') ||
    host.startsWith('preview--') ||
    host.endsWith('.lovableproject.com') ||
    host.endsWith('.lovableproject-dev.com') ||
    host.endsWith('.lovable.dev')
  )
}

export function publicAppOrigin(): string {
  if (typeof window === 'undefined') return PUBLIC_APP_ORIGIN
  const host = window.location?.hostname ?? ''
  const origin = window.location?.origin
  if (origin && !isNonPublicHost(host)) return origin.replace(/\/$/, '')
  return PUBLIC_APP_ORIGIN
}
