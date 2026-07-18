// Shared Google Calendar helpers for OAuth token refresh + event CRUD.
// Used by google-calendar-oauth and google-calendar-sync edge functions.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type GCalConnection = {
  pt_user_id: string
  google_email: string | null
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  calendar_id: string | null
  status: string
}

export type CalendarEventPayload = {
  title: string
  description?: string | null
  location?: string | null
  start_datetime: string
  end_datetime: string | null
  is_all_day?: boolean
}

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars'

function clientCredentials() {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET non configurati')
  }
  return { clientId, clientSecret }
}

/** Refresh access token if expired (or missing). Persists new tokens via service_role client. */
export async function getValidAccessToken(
  admin: SupabaseClient,
  conn: GCalConnection,
): Promise<string> {
  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0
  const stillValid =
    !!conn.access_token && expiresAt > Date.now() + 60_000 // 1 min skew

  if (stillValid) return conn.access_token!

  if (!conn.refresh_token) {
    throw new Error('Refresh token assente: ri-collega Google Calendar')
  }

  const { clientId, clientSecret } = clientCredentials()
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: conn.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  const tokens = await res.json()
  if (!res.ok) {
    await admin
      .from('pt_google_calendar_connections')
      .update({
        status: 'error',
        last_error: tokens.error_description || tokens.error || 'Token refresh failed',
        updated_at: new Date().toISOString(),
      })
      .eq('pt_user_id', conn.pt_user_id)
    throw new Error(tokens.error_description || tokens.error || 'Token refresh failed')
  }

  const expiresAtIso = tokens.expires_in
    ? new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString()
    : null

  await admin
    .from('pt_google_calendar_connections')
    .update({
      access_token: tokens.access_token ?? conn.access_token,
      // Google may omit refresh_token on refresh; keep existing
      refresh_token: tokens.refresh_token ?? conn.refresh_token,
      token_expires_at: expiresAtIso,
      status: 'connected',
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('pt_user_id', conn.pt_user_id)

  return tokens.access_token as string
}

function toGoogleEventBody(event: CalendarEventPayload) {
  if (event.is_all_day) {
    const startDay = event.start_datetime.slice(0, 10)
    const endDay = (event.end_datetime || event.start_datetime).slice(0, 10)
    return {
      summary: event.title,
      description: event.description || undefined,
      location: event.location || undefined,
      start: { date: startDay },
      end: { date: endDay },
    }
  }
  return {
    summary: event.title,
    description: event.description || undefined,
    location: event.location || undefined,
    start: { dateTime: event.start_datetime },
    end: { dateTime: event.end_datetime || event.start_datetime },
  }
}

export async function createGoogleEvent(
  accessToken: string,
  calendarId: string,
  event: CalendarEventPayload,
): Promise<string> {
  const res = await fetch(
    `${GOOGLE_EVENTS_URL}/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(toGoogleEventBody(event)),
    },
  )
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error?.message || data.error_description || 'Create event failed')
  }
  return data.id as string
}

export async function updateGoogleEvent(
  accessToken: string,
  calendarId: string,
  googleEventId: string,
  event: CalendarEventPayload,
): Promise<void> {
  const res = await fetch(
    `${GOOGLE_EVENTS_URL}/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(toGoogleEventBody(event)),
    },
  )
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error?.message || 'Update event failed')
  }
}

export async function deleteGoogleEvent(
  accessToken: string,
  calendarId: string,
  googleEventId: string,
): Promise<void> {
  const res = await fetch(
    `${GOOGLE_EVENTS_URL}/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )
  // 404/410 = already gone — treat as success
  if (res.status === 404 || res.status === 410) return
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error?.message || 'Delete event failed')
  }
}

export async function revokeGoogleToken(token: string): Promise<void> {
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  } catch {
    // best-effort
  }
}

export async function loadConnection(
  admin: SupabaseClient,
  ptUserId: string,
): Promise<GCalConnection | null> {
  const { data, error } = await admin
    .from('pt_google_calendar_connections')
    .select(
      'pt_user_id, google_email, access_token, refresh_token, token_expires_at, calendar_id, status',
    )
    .eq('pt_user_id', ptUserId)
    .maybeSingle()
  if (error) throw error
  return (data as GCalConnection | null) ?? null
}
