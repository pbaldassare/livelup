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

    const base = data.site_url || SUPABASE_URL
    const url = new URL(`${base}/auth/v1/verify`)
    url.searchParams.set('token', data.token_hash)
    url.searchParams.set('type', actionType)
    if (data.redirect_to) url.searchParams.set('redirect_to', data.redirect_to)
    const confirmationUrl = url.toString()

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
        html: `<a href="${confirmationUrl}">${confirmationUrl}</a>`,
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
