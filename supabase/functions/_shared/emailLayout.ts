export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Frontend reale su Cloudflare Pages (iaconnect è ancora Lovable). */
const DEFAULT_APP_ORIGIN = 'https://livelup.pages.dev'
const LOGO_URL = `${DEFAULT_APP_ORIGIN}/livelapp-icon.png`
const BRAND_RED = '#E73235'
const BRAND_BLACK = '#111111'

export function normalizeAppOrigin(raw: string): string {
  const origin = raw.replace(/\/$/, '')
  try {
    const host = new URL(origin).hostname.toLowerCase()
    if (host === 'livelup.pages.dev') return `https://${host}`
  } catch {
    /* fall through */
  }
  return DEFAULT_APP_ORIGIN
}

function readSiteOriginEnv(): string | undefined {
  const deno = (globalThis as { Deno?: { env?: { get?: (key: string) => string | undefined } } }).Deno
  return deno?.env?.get?.('SITE_URL') || deno?.env?.get?.('APP_ORIGIN')
}

export function resolveAppOrigin(): string {
  return normalizeAppOrigin(readSiteOriginEnv() || DEFAULT_APP_ORIGIN)
}

export function authActionAppUrl(actionType: string, tokenHash: string): string {
  const url = new URL(`${resolveAppOrigin()}/auth`)
  url.searchParams.set('type', actionType)
  url.searchParams.set('token_hash', tokenHash)
  return url.toString()
}

export function loginUrl(): string {
  return `${resolveAppOrigin()}/auth`
}

export function wrapLivelappEmail(params: {
  title: string
  headline: string
  bodyHtml: string
}): string {
  const title = escapeHtml(params.title)
  const logo = escapeHtml(LOGO_URL)
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f6;font-family:Arial,Helvetica,sans-serif;color:${BRAND_BLACK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:${BRAND_BLACK};padding:22px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="${logo}" width="48" height="48" alt="Livelapp" style="display:block;border:0;border-radius:12px;background:#ffffff;" />
                  </td>
                  <td style="vertical-align:middle;padding-left:14px;">
                    <div style="font-size:22px;font-weight:800;letter-spacing:0.02em;color:#ffffff;line-height:1.2;">Livelapp</div>
                    <div style="font-size:12px;color:${BRAND_RED};margin-top:4px;font-weight:600;">La tua piattaforma per allenarti</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="height:4px;background:${BRAND_RED};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:${BRAND_BLACK};">${escapeHtml(params.headline)}</h1>
              ${params.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:11px;color:#888888;">
              © Livelapp · Email automatica, non rispondere a questo messaggio.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function ctaButton(href: string, label: string): string {
  const safeHref = escapeHtml(href)
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
    <tr>
      <td style="border-radius:8px;background:${BRAND_RED};">
        <a href="${safeHref}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>
  <p style="margin:0 0 8px;font-size:13px;color:#555555;">Se il pulsante non funziona, copia questo link:</p>
  <p style="margin:0 0 24px;font-size:12px;word-break:break-all;"><a href="${safeHref}" style="color:${BRAND_RED};">${safeHref}</a></p>`
}
