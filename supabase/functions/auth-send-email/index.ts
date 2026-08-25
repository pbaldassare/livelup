// Auth "Send Email" hook -> Resend (conferma, reset password, magic link)
// Vale per PT, atleta e admin: il testo dipende da user_metadata.role
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { buildAuthLinkEmail, parseMailRole } from '../_shared/emailCopy.ts'
import { publicAuthRedirectTo } from '../_shared/emailLayout.ts'
import { sendResendEmail } from '../_shared/resendMail.ts'

const HOOK_SECRET = Deno.env.get('SEND_EMAIL_HOOK_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')

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

async function verifySignature(req: Request, body: string): Promise<boolean> {
  if (!HOOK_SECRET) return false
  const id = req.headers.get('webhook-id')
  const timestamp = req.headers.get('webhook-timestamp')
  const signatureHeader = req.headers.get('webhook-signature')
  if (!id || !timestamp || !signatureHeader) return false

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

    if (!Deno.env.get('RESEND_API_KEY')) {
      console.error('auth-send-email: RESEND_API_KEY missing')
      return json({ error: { http_code: 500, message: 'RESEND_API_KEY not configured' } }, 500)
    }

    if (!SUPABASE_URL) {
      console.error('auth-send-email: SUPABASE_URL missing')
      return json({ error: { http_code: 500, message: 'SUPABASE_URL not configured' } }, 500)
    }

    const payload = JSON.parse(body) as {
      user?: {
        email?: string
        user_metadata?: Record<string, unknown>
        app_metadata?: Record<string, unknown>
      }
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
    const role = parseMailRole(
      payload.user?.user_metadata?.role ?? payload.user?.app_metadata?.role,
    )
    if (!email || !data.token_hash) {
      return json({ error: { http_code: 400, message: 'Invalid hook payload' } }, 400)
    }

    const base = SUPABASE_URL.replace(/\/$/, '')
    const url = new URL(`${base}/auth/v1/verify`)
    url.searchParams.set('token', data.token_hash)
    url.searchParams.set('type', actionType)
    url.searchParams.set('redirect_to', publicAuthRedirectTo(data.redirect_to, actionType))
    const confirmationUrl = url.toString()

    const mail = buildAuthLinkEmail({ actionType, confirmationUrl, email, role })
    const result = await sendResendEmail({
      to: email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    })

    if (!result.sent) {
      console.error(`auth-send-email: Resend failed: ${result.reason}`)
      return json({ error: { http_code: 500, message: result.reason } }, 500)
    }

    console.log(`auth-send-email: sent ${actionType} (${role ?? 'unknown'}) to ${email}`)
    return json({})
  } catch (e) {
    console.error('auth-send-email: unexpected error', e)
    return json({ error: { http_code: 500, message: String(e) } }, 500)
  }
})
