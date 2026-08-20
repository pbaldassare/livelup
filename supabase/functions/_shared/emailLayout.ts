export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function resolveAppOrigin(): string {
  const fromEnv =
    Deno.env.get('SITE_URL') ||
    Deno.env.get('APP_ORIGIN') ||
    'https://livelapp.iaconnect.it'
  return fromEnv.replace(/\/$/, '')
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
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f6;font-family:Arial,Helvetica,sans-serif;color:#111111;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:#0d4f4f;padding:20px 28px;">
              <div style="font-size:20px;font-weight:700;letter-spacing:0.04em;color:#ffffff;">Livelapp</div>
              <div style="font-size:12px;color:#c7e6e6;margin-top:4px;">Allenamento, connessione, progressi</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#0d4f4f;">${escapeHtml(params.headline)}</h1>
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
      <td style="border-radius:8px;background:#0d4f4f;">
        <a href="${safeHref}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>
  <p style="margin:0 0 8px;font-size:13px;color:#555555;">Se il pulsante non funziona, copia questo link:</p>
  <p style="margin:0 0 24px;font-size:12px;word-break:break-all;"><a href="${safeHref}" style="color:#0d4f4f;">${safeHref}</a></p>`
}
