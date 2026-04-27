import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// =====================================================
// SEND PUSH NOTIFICATION - Edge function per inviare push
// Authenticated: requires JWT. Non-admin callers may only
// send notifications to themselves.
// =====================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  type?: string
  action_url?: string
  data?: Record<string, unknown>
}

async function sendPushToEndpoint(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<boolean> {
  try {
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error('Push failed:', response.status)
      return false
    }

    return true
  } catch (error) {
    console.error('Push error:', error)
    return false
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ---- AUTHENTICATION ----
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Client bound to caller's JWT — used only to verify identity
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const callerId = claimsData.claims.sub as string

    // Service-role client for trusted operations
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Check admin role
    const { data: roleRows } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
    const isAdmin = !!roleRows?.some((r: { role: string }) => r.role === 'admin')

    // ---- INPUT ----
    const { user_id, user_ids, payload } = await req.json()

    if (!payload || typeof payload !== 'object') {
      return new Response(
        JSON.stringify({ error: 'payload is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (typeof payload.title !== 'string' || typeof payload.body !== 'string') {
      return new Response(
        JSON.stringify({ error: 'payload.title and payload.body must be strings' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let targetUserIds: string[] = Array.isArray(user_ids)
      ? user_ids.filter((x) => typeof x === 'string')
      : (typeof user_id === 'string' ? [user_id] : [])

    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'user_id or user_ids is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ---- AUTHORIZATION ----
    // Non-admins may only target themselves.
    if (!isAdmin) {
      const onlySelf = targetUserIds.every((id) => id === callerId)
      if (!onlySelf) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: you can only send push notifications to yourself' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ---- SEND ----
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', targetUserIds)

    if (fetchError) throw fetchError

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No subscriptions found', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        sendPushToEndpoint(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload as PushPayload
        )
      )
    )

    const successful = results.filter((r) => r.status === 'fulfilled' && r.value).length
    const failed = results.length - successful

    return new Response(
      JSON.stringify({ success: true, sent: successful, failed, total: subscriptions.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: unknown) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
