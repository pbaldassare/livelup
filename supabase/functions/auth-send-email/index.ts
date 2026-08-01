// Supabase Auth "Send Email" hook -> Resend HTTP API (link-only emails)
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const HOOK_SECRET = Deno.env.get('SEND_EMAIL_HOOK_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const FROM = 'LIVELLAPP <noreply@livelapp.it>'

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToB64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// Standard Webhooks signature verification (same scheme used by Supabase Auth hooks)
async function verifySignature(req: Request, body: string): Promise<boolean> {
  if (!HOOK_SECRET) return false
  const id = req.headers.get('webhook-id')
  const timestamp = req.headers.get('webhook-timestamp')
  const signatureHeader = req.headers.get('webhook-signature')
  if (!id || !timestamp || !signatureHeader) return false

  // Replay protection: 5 minutes tolerance
  const now = Math.floor(Date.now() / 1000)
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(now - ts) > 300) return false

  const rawSecret = HOOK_SECRET.replace(/^v1,/, '').replace(/^whsec_/, '')
  const key = await crypto.subtle.importKey(
    'raw',
    b64ToBytes(rawSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signed = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${id}.${timestamp}.${body}`),
  )
  const expected = bytesToB64(signed)

  return signatureHeader
    .split(' ')
    .map((part) => part.split(',')[1] ?? '')
    .some((sig) => sig && timingSafeEqual(sig, expected))
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function subjectFor(actionType: string): string {
  switch (actionType) {
    case 'signup':
      return 'Conferma registrazione LIVELLAPP'
    case 'recovery':
      return 'Reimposta password LIVELLAPP'
    default:
      return 'LIVELLAPP - Link di verifica'
  }
}

type EmailCopy = {
  headline: string
  intro: string
  cta: string
  footer: string
}

function copyFor(actionType: string): EmailCopy {
  switch (actionType) {
    case 'signup':
      return {
        headline: 'Conferma la tua registrazione',
        intro:
          'Grazie per esserti iscritto a LIVELLAPP. Per attivare il tuo account, conferma l\'indirizzo email cliccando il pulsante qui sotto.',
        cta: 'Conferma email',
        footer: 'Se non hai creato un account su LIVELLAPP, puoi ignorare questa email.',
      }
    case 'recovery':
      return {
        headline: 'Reimposta la password',
        intro:
          'Abbiamo ricevuto una richiesta di reimpostazione password per il tuo account LIVELLAPP. Clicca il pulsante qui sotto per scegliere una nuova password.',
        cta: 'Reimposta password',
        footer:
          'Se non hai richiesto tu il reset, ignora questa email: la password resterà invariata.',
      }
    default:
      return {
        headline: 'Accedi a LIVELLAPP',
        intro:
          'Usa il link qui sotto per accedere in modo sicuro al tuo account LIVELLAPP. Il link scade dopo poco tempo.',
        cta: 'Accedi ora',
        footer: 'Se non hai richiesto questo accesso, puoi ignorare questa email.',
      }
  }
}

function buildAuthEmailHtml(params: {
  actionType: string
  confirmationUrl: string
  email: string
}): string {
  const copy = copyFor(params.actionType)
  const safeUrl = escapeHtml(params.confirmationUrl)
  const safeEmail = escapeHtml(params.email)

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subjectFor(params.actionType))}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f6;font-family:Arial,Helvetica,sans-serif;color:#111111;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:#0d4f4f;padding:20px 28px;">
              <div style="font-size:20px;font-weight:700;letter-spacing:0.04em;color:#ffffff;">LIVELLAPP</div>
              <div style="font-size:12px;color:#c7e6e6;margin-top:4px;">Allenamento, connessione, progressi</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#0d4f4f;">${escapeHtml(copy.headline)}</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333333;">${escapeHtml(copy.intro)}</p>
              <p style="margin:0 0 20px;font-size:13px;color:#666666;">Destinatario: <strong style="color:#111111;">${safeEmail}</strong></p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="border-radius:8px;background:#0d4f4f;">
                    <a href="${safeUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">
                      ${escapeHtml(copy.cta)}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#555555;">Se il pulsante non funziona, copia e incolla questo link nel browser:</p>
              <p style="margin:0 0 24px;font-size:12px;line-height:1.5;word-break:break-all;">
                <a href="${safeUrl}" style="color:#0d4f4f;">${safeUrl}</a>
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:#777777;">${escapeHtml(copy.footer)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:11px;color:#888888;">
              © LIVELLAPP · Email automatica, non rispondere a questo messaggio.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildAuthEmailText(params: {
  actionType: string
  confirmationUrl: string
  email: string
}): string {
  const copy = copyFor(params.actionType)
  return [
    'LIVELLAPP',
    '',
    copy.headline,
    '',
    copy.intro,
    '',
    `Destinatario: ${params.email}`,
    '',
    `${copy.cta}:`,
    params.confirmationUrl,
    '',
    copy.footer,
    '',
    '© LIVELLAPP — Email automatica, non rispondere a questo messaggio.',
  ].join('\n')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const body = await req.text()

    if (!(await verifySignature(req, body))) {
      console.error('auth-send-email: invalid webhook signature')
      return json({ error: { http_code: 401, message: 'Invalid signature' } }, 401)
    }

    if (!RESEND_API_KEY) {
      console.error('auth-send-email: RESEND_API_KEY missing')
      return json({ error: { http_code: 500, message: 'RESEND_API_KEY not configured' } }, 500)
    }

    if (!SUPABASE_URL) {
      console.error('auth-send-email: SUPABASE_URL missing')
      return json({ error: { http_code: 500, message: 'SUPABASE_URL not configured' } }, 500)
    }

    const payload = JSON.parse(body) as {
      user?: { email?: string }
      email_data?: {
        token_hash?: string
        redirect_to?: string
        email_action_type?: string
        site_url?: string
      }
    }

    const email = payload.user?.email
    const data = payload.email_data ?? {}
    const actionType = data.email_action_type ?? 'magiclink'
    if (!email || !data.token_hash) {
      return json({ error: { http_code: 400, message: 'Invalid hook payload' } }, 400)
    }

    // Verify endpoint MUST be the Auth API host, never the frontend site_url
    const base = SUPABASE_URL.replace(/\/$/, '')
    const url = new URL(`${base}/auth/v1/verify`)
    url.searchParams.set('token', data.token_hash)
    url.searchParams.set('type', actionType)
    if (data.redirect_to) url.searchParams.set('redirect_to', data.redirect_to)
    const confirmationUrl = url.toString()

    const html = buildAuthEmailHtml({ actionType, confirmationUrl, email })
    const text = buildAuthEmailText({ actionType, confirmationUrl, email })

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: subjectFor(actionType),
        html,
        text,
      }),
    })

    if (!res.ok) {
      const details = await res.text()
      console.error(`auth-send-email: Resend failed [${res.status}]: ${details}`)
      return json({ error: { http_code: res.status, message: details } }, res.status)
    }

    console.log(`auth-send-email: sent ${actionType} email to ${email}`)
    return json({})
  } catch (e) {
    console.error('auth-send-email: unexpected error', e)
    return json({ error: { http_code: 500, message: String(e) } }, 500)
  }
})
