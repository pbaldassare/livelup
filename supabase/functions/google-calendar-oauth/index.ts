import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { loadConnection, revokeGoogleToken } from '../_shared/googleCalendar.ts'

// =====================================================
// GOOGLE CALENDAR OAUTH
// Actions: start | status | disconnect | callback
// Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
// Optional: GOOGLE_REDIRECT_URI, APP_ORIGIN
// See ./README.md for Google Cloud Console setup.
// =====================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function redirect(url: string) {
  return new Response(null, {
    status: 302,
    headers: { Location: url },
  })
}

function defaultRedirectUri(supabaseUrl: string) {
  return `${supabaseUrl}/functions/v1/google-calendar-oauth?action=callback`
}

function encodeState(payload: Record<string, unknown>) {
  return btoa(JSON.stringify(payload))
}

function decodeState(raw: string): { uid: string; returnTo?: string; t?: number } {
  return JSON.parse(atob(raw)) as { uid: string; returnTo?: string; t?: number }
}

function safeReturnPath(path: string | undefined): string {
  if (!path || !path.startsWith('/') || path.startsWith('//')) {
    return '/pt/calendar/appuntamenti'
  }
  return path
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  let action = url.searchParams.get('action')

  let body: Record<string, unknown> = {}
  if (req.method === 'POST') {
    try {
      body = await req.json()
    } catch {
      body = {}
    }
    action = (body.action as string) || action
  }

  // OAuth callback from Google (no JWT — verify_jwt=false in config.toml)
  if (action === 'callback') {
    return handleCallback(url)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'Non autenticato' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const userClient = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()
  if (userError || !user) {
    return json({ error: 'Sessione non valida' }, 401)
  }

  const admin = createClient(supabaseUrl, serviceKey)

  if (action === 'status') {
    const conn = await loadConnection(admin, user.id)
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
    return json({
      configured: !!(clientId && clientSecret),
      status: conn?.status ?? 'disconnected',
      google_email: conn?.google_email ?? null,
      calendar_id: conn?.calendar_id ?? null,
    })
  }

  if (action === 'disconnect') {
    const conn = await loadConnection(admin, user.id)
    if (conn?.access_token) await revokeGoogleToken(conn.access_token)
    if (conn?.refresh_token) await revokeGoogleToken(conn.refresh_token)

    const { error } = await admin
      .from('pt_google_calendar_connections')
      .delete()
      .eq('pt_user_id', user.id)
    if (error) return json({ error: error.message }, 500)
    return json({ ok: true, status: 'disconnected' })
  }

  if (action === 'start' || !action) {
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
    if (!clientId || !clientSecret) {
      return json({
        configured: false,
        message:
          'Google Calendar non è ancora configurato. Imposta GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET sulle Edge Functions.',
      })
    }

    const redirectUri =
      Deno.env.get('GOOGLE_REDIRECT_URI') || defaultRedirectUri(supabaseUrl)

    const returnTo = safeReturnPath(
      typeof body.return_to === 'string' ? body.return_to : undefined,
    )
    const state = encodeState({ uid: user.id, t: Date.now(), returnTo })

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', SCOPES)
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    authUrl.searchParams.set('state', state)

    await admin.from('pt_google_calendar_connections').upsert(
      {
        pt_user_id: user.id,
        status: 'pending',
        last_error: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'pt_user_id' },
    )

    return json({ configured: true, url: authUrl.toString() })
  }

  return json({ error: 'Azione non supportata' }, 400)
})

async function handleCallback(url: URL) {
  const code = url.searchParams.get('code')
  const stateRaw = url.searchParams.get('state')
  const err = url.searchParams.get('error')
  const appOrigin = Deno.env.get('APP_ORIGIN') || 'https://livelapp.iaconnect.it'

  let returnTo = '/pt/calendar/appuntamenti'
  if (stateRaw) {
    try {
      returnTo = safeReturnPath(decodeState(stateRaw).returnTo)
    } catch {
      /* keep default */
    }
  }

  const successRedirect = `${appOrigin}${returnTo}${returnTo.includes('?') ? '&' : '?'}gcal=connected`
  const errorRedirect = `${appOrigin}${returnTo}${returnTo.includes('?') ? '&' : '?'}gcal=error`

  if (err || !code || !stateRaw) {
    return redirect(errorRedirect)
  }

  let uid: string
  try {
    const state = decodeState(stateRaw)
    uid = state.uid
    if (!uid) throw new Error('missing uid')
    // Reject stale state (> 30 min)
    if (state.t && Date.now() - state.t > 30 * 60 * 1000) {
      return redirect(errorRedirect)
    }
  } catch {
    return redirect(errorRedirect)
  }

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const redirectUri =
    Deno.env.get('GOOGLE_REDIRECT_URI') || defaultRedirectUri(supabaseUrl)

  if (!clientId || !clientSecret) {
    return redirect(errorRedirect)
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const tokens = await tokenRes.json()
    if (!tokenRes.ok) {
      throw new Error(tokens.error_description || tokens.error || 'Token exchange failed')
    }

    let googleEmail: string | null = null
    let googleAccountId: string | null = null
    if (tokens.access_token) {
      const infoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      if (infoRes.ok) {
        const info = await infoRes.json()
        googleEmail = info.email ?? null
        googleAccountId = info.id ?? null
      }
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString()
      : null

    // Preserve existing refresh_token if Google omits it on re-consent edge cases
    const existing = await loadConnection(admin, uid)

    await admin.from('pt_google_calendar_connections').upsert(
      {
        pt_user_id: uid,
        google_email: googleEmail,
        google_account_id: googleAccountId,
        access_token: tokens.access_token ?? null,
        refresh_token: tokens.refresh_token ?? existing?.refresh_token ?? null,
        token_expires_at: expiresAt,
        calendar_id: existing?.calendar_id || 'primary',
        status: 'connected',
        last_error: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'pt_user_id' },
    )

    return redirect(successRedirect)
  } catch (e) {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    await admin.from('pt_google_calendar_connections').upsert(
      {
        pt_user_id: uid,
        status: 'error',
        last_error: e instanceof Error ? e.message : 'OAuth error',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'pt_user_id' },
    )
    return redirect(errorRedirect)
  }
}
