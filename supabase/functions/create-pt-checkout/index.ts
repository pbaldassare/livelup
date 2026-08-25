import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY missing')

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Non autorizzato' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    })
    const admin = createClient(supabaseUrl, service, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(token)
    if (claimsError || !claims?.claims?.sub) {
      return json({ error: 'Token non valido' }, 401)
    }
    const userId = claims.claims.sub as string

    const { data: role } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'pt')
      .maybeSingle()
    if (!role) return json({ error: 'Solo i Professionisti possono pagare il piano' }, 403)

    const body = await req.json().catch(() => ({}))
    const planId = body.plan_id as string | undefined
    if (!planId) return json({ error: 'plan_id obbligatorio' }, 400)

    const { data: upgrade, error: upErr } = await userClient.rpc('request_pt_plan_upgrade', {
      _plan_id: planId,
    })
    if (upErr) return json({ error: upErr.message }, 400)

    const paymentId = (upgrade as { payment_id?: string })?.payment_id
    const { data: plan, error: planErr } = await admin
      .from('subscription_plans')
      .select('id, name, stripe_price_id, price_monthly')
      .eq('id', planId)
      .maybeSingle()
    if (planErr || !plan?.stripe_price_id) {
      return json({ error: 'Piano senza prezzo Stripe. Aggiorna stripe_price_id in Abbonamenti.' }, 400)
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('email')
      .eq('user_id', userId)
      .maybeSingle()

    const { data: sub } = await admin
      .from('subscriptions')
      .select('id, stripe_customer_id')
      .eq('user_id', userId)
      .in('subscription_type', ['pt_base', 'pt_premium'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    })

    let customerId = sub?.stripe_customer_id as string | null
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email || undefined,
        metadata: { livelapp_user_id: userId },
      })
      customerId = customer.id
      if (sub?.id) {
        await admin.from('subscriptions').update({ stripe_customer_id: customerId }).eq('id', sub.id)
      }
    }

    const site = (Deno.env.get('SITE_URL') || 'https://livelapp.iaconnect.it').replace(/\/$/, '')
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: userId,
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      success_url: `${site}/pt/payments?checkout=success`,
      cancel_url: `${site}/pt/payments?checkout=cancel`,
      metadata: {
        livelapp_user_id: userId,
        plan_id: planId,
        payment_id: paymentId || '',
      },
      subscription_data: {
        metadata: {
          livelapp_user_id: userId,
          plan_id: planId,
          payment_id: paymentId || '',
        },
      },
    })

    if (paymentId) {
      await admin
        .from('payments')
        .update({ stripe_payment_intent_id: session.id, payment_method: 'stripe' })
        .eq('id', paymentId)
    }

    return json({ url: session.url, payment_id: paymentId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout fallito'
    return json({ error: message }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
