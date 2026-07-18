import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  createGoogleEvent,
  deleteGoogleEvent,
  getValidAccessToken,
  loadConnection,
  updateGoogleEvent,
  type CalendarEventPayload,
} from '../_shared/googleCalendar.ts'

// =====================================================
// GOOGLE CALENDAR SYNC
// Actions: create | update | delete
// Body: { action, calendar_event_id }
// Requires PT JWT. No-ops with { synced: false } if not connected.
// Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (same as oauth)
// =====================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Non autenticato' }, 401)

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
    if (userError || !user) return json({ error: 'Sessione non valida' }, 401)

    let body: { action?: string; calendar_event_id?: string } = {}
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Body JSON richiesto' }, 400)
    }

    const action = body.action
    const eventId = body.calendar_event_id
    if (!action || !eventId) {
      return json({ error: 'action e calendar_event_id obbligatori' }, 400)
    }
    if (!['create', 'update', 'delete'].includes(action)) {
      return json({ error: 'Azione non supportata' }, 400)
    }

    const admin = createClient(supabaseUrl, serviceKey)

    const { data: event, error: eventErr } = await admin
      .from('calendar_events')
      .select(
        'id, pt_user_id, title, description, location, start_datetime, end_datetime, is_all_day, is_cancelled, google_event_id, category',
      )
      .eq('id', eventId)
      .maybeSingle()

    if (eventErr) return json({ error: eventErr.message }, 500)
    if (!event) return json({ error: 'Evento non trovato' }, 404)
    if (event.pt_user_id !== user.id) {
      return json({ error: 'Non autorizzato' }, 403)
    }

    const conn = await loadConnection(admin, user.id)
    if (!conn || conn.status !== 'connected') {
      return json({ synced: false, reason: 'not_connected' })
    }

    const accessToken = await getValidAccessToken(admin, conn)
    const calendarId = conn.calendar_id || 'primary'
    const payload: CalendarEventPayload = {
      title: event.title,
      description: event.description,
      location: event.location,
      start_datetime: event.start_datetime,
      end_datetime: event.end_datetime,
      is_all_day: event.is_all_day,
    }

    if (action === 'delete' || event.is_cancelled) {
      if (event.google_event_id) {
        await deleteGoogleEvent(accessToken, calendarId, event.google_event_id)
      }
      await admin
        .from('calendar_events')
        .update({ google_event_id: null })
        .eq('id', eventId)
      await admin
        .from('pt_google_calendar_connections')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('pt_user_id', user.id)
      return json({ synced: true, action: 'delete' })
    }

    if (action === 'update' && event.google_event_id) {
      await updateGoogleEvent(accessToken, calendarId, event.google_event_id, payload)
      await admin
        .from('pt_google_calendar_connections')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('pt_user_id', user.id)
      return json({ synced: true, action: 'update', google_event_id: event.google_event_id })
    }

    // create (or update without existing google id → create)
    const googleEventId = await createGoogleEvent(accessToken, calendarId, payload)
    await admin
      .from('calendar_events')
      .update({ google_event_id: googleEventId })
      .eq('id', eventId)
    await admin
      .from('pt_google_calendar_connections')
      .update({ last_synced_at: new Date().toISOString(), last_error: null })
      .eq('pt_user_id', user.id)

    return json({ synced: true, action: 'create', google_event_id: googleEventId })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sync error'
    return json({ synced: false, error: message }, 500)
  }
})
