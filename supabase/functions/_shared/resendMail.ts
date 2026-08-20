export type MailResult = { sent: boolean; reason?: string }

export function resendFromAddress(): string {
  return Deno.env.get('RESEND_FROM_EMAIL') || 'Livelapp <noreply@livelapp.it>'
}

export async function sendResendEmail(params: {
  to: string
  subject: string
  html: string
  text: string
}): Promise<MailResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) {
    console.warn(`[resend] RESEND_API_KEY missing — skipped email to ${params.to}`)
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
        from: resendFromAddress(),
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      console.error('[resend] send failed:', detail)
      return { sent: false, reason: 'email_send_failed' }
    }

    return { sent: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'unknown_error'
    console.error('[resend] unexpected error:', msg)
    return { sent: false, reason: 'email_send_failed' }
  }
}
