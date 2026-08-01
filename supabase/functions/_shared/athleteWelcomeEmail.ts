export const DEFAULT_ATHLETE_PASSWORD = 'Leone123!'

export type WelcomeEmailPayload = {
  to: string
  firstName: string
  lastName: string
  ptName: string
  temporaryPassword: string
}

export type WelcomeEmailResult = {
  sent: boolean
  reason?: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function resolveAppOrigin(): string {
  const fromEnv =
    Deno.env.get('SITE_URL') ||
    Deno.env.get('APP_ORIGIN') ||
    'https://livelapp.iaconnect.it'
  return fromEnv.replace(/\/$/, '')
}

function buildWelcomeEmailHtml(payload: WelcomeEmailPayload, loginUrl: string): string {
  const fullName = [payload.firstName, payload.lastName].filter(Boolean).join(' ').trim()
  const safeName = escapeHtml(fullName || 'Atleta')
  const safePt = escapeHtml(payload.ptName)
  const safeEmail = escapeHtml(payload.to)
  const safePassword = escapeHtml(payload.temporaryPassword)
  const safeLoginUrl = escapeHtml(loginUrl)

  return `
<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6f6;font-family:Arial,Helvetica,sans-serif;color:#111111;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:#0d4f4f;padding:20px 28px;">
              <div style="font-size:20px;font-weight:700;letter-spacing:0.04em;color:#ffffff;">Livelapp</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 12px;font-size:22px;color:#0d4f4f;">Benvenuto su Livelapp</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Ciao ${safeName},</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;"><strong>${safePt}</strong> ha creato il tuo account atleta su Livelapp.</p>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Accedi con queste credenziali temporanee:</p>
              <ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.6;">
                <li><strong>Email:</strong> ${safeEmail}</li>
                <li><strong>Password temporanea:</strong> ${safePassword}</li>
              </ul>
              <p style="margin:0 0 20px;font-size:14px;color:#b45309;font-weight:bold;">Per la tua sicurezza, cambia la password subito dopo il primo accesso.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="border-radius:8px;background:#0d4f4f;">
                    <a href="${safeLoginUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Accedi a Livelapp</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;color:#555555;">Se il pulsante non funziona, copia questo link:</p>
              <p style="margin:0 0 24px;font-size:12px;word-break:break-all;"><a href="${safeLoginUrl}" style="color:#0d4f4f;">${safeLoginUrl}</a></p>
              <p style="margin:0;font-size:12px;color:#777777;">Se non ti aspettavi questa email, contatta il tuo Personal Trainer.</p>
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
</html>
`.trim()
}

function buildWelcomeEmailText(payload: WelcomeEmailPayload, loginUrl: string): string {
  const fullName = [payload.firstName, payload.lastName].filter(Boolean).join(' ').trim()
  return [
    'Livelapp',
    '',
    'Benvenuto su Livelapp',
    '',
    `Ciao ${fullName || 'Atleta'},`,
    '',
    `${payload.ptName} ha creato il tuo account atleta su Livelapp.`,
    '',
    'Credenziali temporanee:',
    `Email: ${payload.to}`,
    `Password temporanea: ${payload.temporaryPassword}`,
    '',
    'Per la tua sicurezza, cambia la password subito dopo il primo accesso.',
    '',
    `Accedi: ${loginUrl}`,
    '',
    'Se non ti aspettavi questa email, contatta il tuo Personal Trainer.',
    '',
    '© Livelapp — Email automatica, non rispondere a questo messaggio.',
  ].join('\n')
}

export async function sendAthleteWelcomeEmail(
  payload: WelcomeEmailPayload,
): Promise<WelcomeEmailResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from =
    Deno.env.get('RESEND_FROM_EMAIL') || 'Livelapp <noreply@livelapp.it>'
  const loginUrl = `${resolveAppOrigin()}/auth`

  if (!apiKey) {
    console.warn(
      `[welcome-email] RESEND_API_KEY not configured — skipped email to ${payload.to}`,
    )
    return { sent: false, reason: 'email_not_configured' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [payload.to],
        subject: 'Benvenuto su Livelapp — credenziali di accesso',
        html: buildWelcomeEmailHtml(payload, loginUrl),
        text: buildWelcomeEmailText(payload, loginUrl),
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      console.error('[welcome-email] Resend error:', detail)
      return { sent: false, reason: 'email_send_failed' }
    }

    return { sent: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'unknown_error'
    console.error('[welcome-email] Unexpected error:', msg)
    return { sent: false, reason: 'email_send_failed' }
  }
}
