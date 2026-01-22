import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// =====================================================
// SEND PUSH NOTIFICATION - Edge function per inviare push
// =====================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// VAPID keys - generated for this project
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || 'Wml8oo_YaLNNi5g-kOE6EMNqPp7Dl-nLH3RhLWsNqFU'

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
    // For now, use a simple fetch to the push service
    // In production, you'd use web-push library or similar
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error('Push failed:', response.status, await response.text())
      return false
    }

    return true
  } catch (error) {
    console.error('Push error:', error)
    return false
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { user_id, user_ids, payload } = await req.json()

    if (!payload) {
      throw new Error('Payload is required')
    }

    // Get target user IDs
    const targetUserIds = user_ids || (user_id ? [user_id] : [])

    if (targetUserIds.length === 0) {
      throw new Error('user_id or user_ids is required')
    }

    // Fetch push subscriptions for target users
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', targetUserIds)

    if (fetchError) {
      throw fetchError
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No subscriptions found',
          sent: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Send push notifications
    const results = await Promise.allSettled(
      subscriptions.map(sub => 
        sendPushToEndpoint(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload
        )
      )
    )

    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length
    const failed = results.length - successful

    // Clean up invalid subscriptions (those that consistently fail)
    // This is a simplified version - in production you'd track failures

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successful,
        failed,
        total: subscriptions.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: unknown) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
