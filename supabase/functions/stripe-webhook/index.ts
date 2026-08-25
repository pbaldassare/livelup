import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!stripeKey || !webhookSecret) {
    return new Response('stripe not configured', { status: 500 })
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2024-06-20',
    httpClient: Stripe.createFetchHttpClient(),
  })

  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('missing signature', { status: 400 })

  const rawBody = await req.text()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'invalid signature'
    console.error('stripe webhook signature', message)
    return new Response(message, { status: 400 })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const paymentId = session.metadata?.payment_id
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
      const subId =
        typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
      if (paymentId) {
        await admin.rpc('apply_pt_stripe_payment', {
          _payment_id: paymentId,
          _stripe_customer_id: customerId || null,
          _stripe_subscription_id: subId || null,
          _stripe_invoice_id: typeof session.invoice === 'string' ? session.invoice : null,
        })
      }
    }

    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice
      const stripeSub =
        typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
      if (stripeSub && invoice.billing_reason === 'subscription_cycle') {
        const { data: sub } = await admin
          .from('subscriptions')
          .select('id, user_id, plan_id, price_monthly')
          .eq('stripe_subscription_id', stripeSub)
          .maybeSingle()
        if (sub) {
          await admin.from('payments').insert({
            user_id: sub.user_id,
            subscription_id: sub.id,
            plan_id: sub.plan_id,
            amount: (invoice.amount_paid || 0) / 100,
            currency: (invoice.currency || 'eur').toUpperCase(),
            status: 'completed',
            payment_method: 'stripe',
            stripe_invoice_id: invoice.id,
            paid_at: new Date().toISOString(),
            description: 'Rinnovo abbonamento Livelapp',
          })
          await admin
            .from('subscriptions')
            .update({
              status: 'attivo',
              past_due_since: null,
              grace_period_ends_at: null,
              next_billing_at: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq('id', sub.id)
        }
      }
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice
      const stripeSub =
        typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
      if (stripeSub) {
        const { data: sub } = await admin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', stripeSub)
          .maybeSingle()
        if (sub?.user_id) {
          await admin.rpc('enforce_pt_past_due_one', { _pt_user_id: sub.user_id })
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      await admin
        .from('subscriptions')
        .update({ status: 'bloccato', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', subscription.id)
    }
  } catch (err) {
    console.error('stripe webhook handler', err)
    return new Response('handler error', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
