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

function buildWelcomeEmailHtml(payload: WelcomeEmailPayload, loginUrl: string): string {
  const fullName = [payload.firstName, payload.lastName].filter(Boolean).join(' ').trim()

  return `
<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
  <h1 style="color: #0d4f4f;">Benvenuto su LIVELLAPP</h1>
  <p>Ciao ${fullName || 'Atleta'},</p>
  <p><strong>${payload.ptName}</strong> ha creato il tuo account atleta su LIVELLAPP.</p>
  <p>Accedi con queste credenziali temporanee:</p>
  <ul>
    <li><strong>Email:</strong> ${payload.to}</li>
    <li><strong>Password temporanea:</strong> ${payload.temporaryPassword}</li>
  </ul>
  <p style="color: #b45309; font-weight: bold;">Per la tua sicurezza, cambia la password subito dopo il primo accesso.</p>
  <p><a href="${loginUrl}" style="display:inline-block;padding:12px 24px;background:#0d4f4f;color:#fff;text-decoration:none;border-radius:6px;">Accedi a LIVELLAPP</a></p>
  <p style="font-size: 12px; color: #666;">Se non ti aspettavi questa email, contatta il tuo Personal Trainer.</p>
</body>
</html>
`.trim()
}

export async function sendAthleteWelcomeEmail(
  payload: WelcomeEmailPayload,
): Promise<WelcomeEmailResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from =
    Deno.env.get('RESEND_FROM_EMAIL') || 'LIVELLAPP <noreply@livelapp.it>'
  const siteUrl =
    Deno.env.get('SITE_URL') ||
    Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') ||
    'https://livelapp.iaconnect.it'
  const loginUrl = `${siteUrl.replace(/\/$/, '')}/auth`

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
        subject: 'Benvenuto su LIVELLAPP — credenziali di accesso',
        html: buildWelcomeEmailHtml(payload, loginUrl),
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
