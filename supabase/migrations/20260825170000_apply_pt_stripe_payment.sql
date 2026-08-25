-- RPC usata dal webhook Stripe (service_role) per attivare il piano PT.
CREATE OR REPLACE FUNCTION public.apply_pt_stripe_payment(
  _payment_id UUID,
  _stripe_customer_id TEXT,
  _stripe_subscription_id TEXT,
  _stripe_invoice_id TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pay public.payments%ROWTYPE;
  v_plan public.subscription_plans%ROWTYPE;
  v_count INTEGER;
BEGIN
  SELECT * INTO v_pay FROM public.payments WHERE id = _payment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'pagamento non trovato'; END IF;
  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = v_pay.plan_id;
  v_count := public.count_pt_active_athletes(v_pay.user_id);

  UPDATE public.payments SET
    status = 'completed',
    paid_at = COALESCE(paid_at, now()),
    payment_method = 'stripe',
    stripe_invoice_id = COALESCE(_stripe_invoice_id, stripe_invoice_id),
    updated_at = now()
  WHERE id = _payment_id;

  IF v_pay.subscription_id IS NOT NULL AND v_plan.id IS NOT NULL THEN
    UPDATE public.subscriptions SET
      plan_id = v_plan.id,
      pending_plan_id = NULL,
      subscription_type = v_plan.plan_type,
      price_monthly = v_plan.price_monthly,
      status = 'attivo',
      billed_athlete_count = v_count,
      current_athlete_count = v_count,
      past_due_since = NULL,
      grace_period_ends_at = NULL,
      next_billing_at = now() + INTERVAL '1 month',
      stripe_customer_id = COALESCE(_stripe_customer_id, stripe_customer_id),
      stripe_subscription_id = COALESCE(_stripe_subscription_id, stripe_subscription_id),
      updated_at = now()
    WHERE id = v_pay.subscription_id;
  END IF;

  PERFORM public.insert_pt_billing_event(v_pay.user_id, v_pay.subscription_id, _payment_id, 'payment_completed', NULL, v_plan.id, v_count, '{}'::jsonb);
  PERFORM public.insert_pt_billing_event(v_pay.user_id, v_pay.subscription_id, _payment_id, 'tier_up', NULL, v_plan.id, v_count, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_pt_stripe_payment(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_pt_stripe_payment(UUID, TEXT, TEXT, TEXT) TO service_role;
