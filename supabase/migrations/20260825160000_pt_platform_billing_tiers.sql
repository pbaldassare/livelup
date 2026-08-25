-- =====================================================
-- Billing piattaforma PT: fasce per numero atleti attivi
-- Starter 0-5 gratis, Growth 6-20 €19.90, Pro 21-50 €49.90,
-- Unlimited 51+ €99.90. Stripe IDs lasciati vuoti.
-- =====================================================

-- -----------------------------------------------------
-- COLONNE: piani, abbonamenti, pagamenti
-- -----------------------------------------------------

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS min_athletes INTEGER,
  ADD COLUMN IF NOT EXISTS slug TEXT;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS required_plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pending_plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scheduled_downgrade_plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billed_athlete_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_athlete_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS past_due_since TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS athlete_count_snapshot INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_plans_slug
  ON public.subscription_plans(slug)
  WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_past_due ON public.subscriptions(past_due_since)
  WHERE past_due_since IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_plan ON public.payments(plan_id);

-- -----------------------------------------------------
-- TABELLA: eventi billing (audit)
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pt_billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  from_plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  to_plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  athlete_count INTEGER,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pt_billing_events_type_check CHECK (
    event_type IN (
      'ensured',
      'tier_sync',
      'upgrade_requested',
      'tier_up',
      'tier_down_scheduled',
      'tier_down',
      'payment_pending',
      'payment_completed',
      'payment_failed',
      'grace_started',
      'blocked',
      'unblocked',
      'reactivated'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_pt_billing_events_pt ON public.pt_billing_events(pt_user_id, created_at DESC);

ALTER TABLE public.pt_billing_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pt_billing_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pt_billing_events TO service_role;

DROP POLICY IF EXISTS "PT can view own billing events" ON public.pt_billing_events;
CREATE POLICY "PT can view own billing events"
  ON public.pt_billing_events FOR SELECT TO authenticated
  USING (pt_user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage billing events" ON public.pt_billing_events;
CREATE POLICY "Admins can manage billing events"
  ON public.pt_billing_events FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- -----------------------------------------------------
-- SEED piani fasce
-- -----------------------------------------------------

INSERT INTO public.subscription_plans (
  name, description, target_role, plan_type, slug,
  min_athletes, max_athletes, price_monthly, price_yearly, currency,
  features, includes_chat, includes_analytics, trial_days,
  is_active, is_featured, sort_order, stripe_price_id
)
SELECT v.name, v.description, 'pt'::public.app_role, v.plan_type, v.slug,
       v.min_athletes, v.max_athletes, v.price_monthly, v.price_yearly, 'EUR',
       v.features, true, v.includes_analytics, 0,
       true, v.is_featured, v.sort_order, NULL
FROM (
  VALUES
    ('Starter'::text, 'Fino a 5 atleti attivi. Piano gratuito per iniziare.'::text, 'pt_base'::public.subscription_type, 'starter'::text, 0, 5, 0::numeric, 0::numeric, '["Fino a 5 atleti attivi","Schede, chat e calendario","Storico atleti conservato"]'::jsonb, false, false, 10),
    ('Growth', 'Da 6 a 20 atleti attivi.', 'pt_premium', 'growth', 6, 20, 19.90, 191.00, '["Da 6 a 20 atleti attivi","Tutte le funzioni Starter","Adatto a studi in crescita"]'::jsonb, true, true, 20),
    ('Pro', 'Da 21 a 50 atleti attivi.', 'pt_premium', 'pro', 21, 50, 49.90, 479.00, '["Da 21 a 50 atleti attivi","Tutte le funzioni Growth","Pensato per team strutturati"]'::jsonb, true, false, 30),
    ('Unlimited', 'Da 51 atleti in poi, senza tetto.', 'pt_premium', 'unlimited', 51, NULL::integer, 99.90, 959.00, '["Atleti illimitati","Tutte le funzioni Pro","Per studi e network"]'::jsonb, true, false, 40)
) AS v(name, description, plan_type, slug, min_athletes, max_athletes, price_monthly, price_yearly, features, includes_analytics, is_featured, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscription_plans sp WHERE sp.slug = v.slug
);

UPDATE public.subscription_plans sp SET
  name = v.name,
  description = v.description,
  min_athletes = v.min_athletes,
  max_athletes = v.max_athletes,
  price_monthly = v.price_monthly,
  price_yearly = v.price_yearly,
  features = v.features,
  is_active = true,
  is_featured = v.is_featured,
  sort_order = v.sort_order,
  updated_at = now()
FROM (
  VALUES
    ('starter'::text, 'Starter'::text, 'Fino a 5 atleti attivi. Piano gratuito per iniziare.'::text, 0, 5, 0::numeric, 0::numeric, '["Fino a 5 atleti attivi","Schede, chat e calendario","Storico atleti conservato"]'::jsonb, false, 10),
    ('growth', 'Growth', 'Da 6 a 20 atleti attivi.', 6, 20, 19.90, 191.00, '["Da 6 a 20 atleti attivi","Tutte le funzioni Starter","Adatto a studi in crescita"]'::jsonb, true, 20),
    ('pro', 'Pro', 'Da 21 a 50 atleti attivi.', 21, 50, 49.90, 479.00, '["Da 21 a 50 atleti attivi","Tutte le funzioni Growth","Pensato per team strutturati"]'::jsonb, false, 30),
    ('unlimited', 'Unlimited', 'Da 51 atleti in poi, senza tetto.', 51, NULL::integer, 99.90, 959.00, '["Atleti illimitati","Tutte le funzioni Pro","Per studi e network"]'::jsonb, false, 40)
) AS v(slug, name, description, min_athletes, max_athletes, price_monthly, price_yearly, features, is_featured, sort_order)
WHERE sp.slug = v.slug;

UPDATE public.subscription_plans
SET is_active = false, updated_at = now()
WHERE target_role = 'pt'
  AND (slug IS NULL OR slug NOT IN ('starter', 'growth', 'pro', 'unlimited'));

-- -----------------------------------------------------
-- HELPERS
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_pt_plan_id_for_count(_athlete_count INTEGER)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.subscription_plans
  WHERE target_role = 'pt'
    AND is_active = true
    AND slug IS NOT NULL
    AND COALESCE(min_athletes, 0) <= GREATEST(_athlete_count, 0)
    AND (max_athletes IS NULL OR max_athletes >= GREATEST(_athlete_count, 0))
  ORDER BY price_monthly ASC NULLS FIRST
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.insert_pt_billing_event(
  _pt_user_id UUID,
  _subscription_id UUID,
  _payment_id UUID,
  _event_type TEXT,
  _from_plan_id UUID,
  _to_plan_id UUID,
  _athlete_count INTEGER,
  _payload JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.pt_billing_events (
    pt_user_id, subscription_id, payment_id, event_type,
    from_plan_id, to_plan_id, athlete_count, payload
  ) VALUES (
    _pt_user_id, _subscription_id, _payment_id, _event_type,
    _from_plan_id, _to_plan_id, _athlete_count, COALESCE(_payload, '{}'::jsonb)
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_pt_platform_subscription(_pt_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub_id UUID;
  v_plan_id UUID;
  v_count INTEGER;
BEGIN
  SELECT id INTO v_sub_id
  FROM public.subscriptions
  WHERE user_id = _pt_user_id
    AND subscription_type IN ('pt_base', 'pt_premium')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_sub_id IS NOT NULL THEN
    RETURN v_sub_id;
  END IF;

  IF NOT public.has_role(_pt_user_id, 'pt') THEN
    RETURN NULL;
  END IF;

  v_count := public.count_pt_active_athletes(_pt_user_id);
  v_plan_id := public.get_pt_plan_id_for_count(v_count);
  IF v_plan_id IS NULL THEN
    SELECT id INTO v_plan_id FROM public.subscription_plans WHERE slug = 'starter' LIMIT 1;
  END IF;

  INSERT INTO public.subscriptions (
    user_id, subscription_type, status, plan_id, required_plan_id,
    billed_athlete_count, current_athlete_count,
    price_monthly, currency, started_at
  )
  SELECT
    _pt_user_id,
    p.plan_type,
    'attivo',
    p.id,
    p.id,
    v_count,
    v_count,
    p.price_monthly,
    COALESCE(p.currency, 'EUR'),
    now()
  FROM public.subscription_plans p
  WHERE p.id = v_plan_id
  RETURNING id INTO v_sub_id;

  PERFORM public.insert_pt_billing_event(
    _pt_user_id, v_sub_id, NULL, 'ensured', NULL, v_plan_id, v_count, '{}'::jsonb
  );

  RETURN v_sub_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_pt_past_due_one(_pt_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public.subscriptions%ROWTYPE;
BEGIN
  SELECT * INTO v_sub
  FROM public.subscriptions
  WHERE user_id = _pt_user_id
    AND subscription_type IN ('pt_base', 'pt_premium')
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF COALESCE(v_sub.price_monthly, 0) <= 0 OR v_sub.next_billing_at IS NULL THEN
    RETURN;
  END IF;

  IF v_sub.status = 'bloccato' THEN
    RETURN;
  END IF;

  IF v_sub.next_billing_at > now() THEN
    RETURN;
  END IF;

  -- Periodo già coperto da un pagamento completed recente
  IF EXISTS (
    SELECT 1 FROM public.payments pay
    WHERE pay.subscription_id = v_sub.id
      AND pay.status = 'completed'
      AND (
        (pay.period_end IS NOT NULL AND pay.period_end >= now())
        OR pay.paid_at >= now() - INTERVAL '32 days'
      )
  ) THEN
    UPDATE public.subscriptions
    SET past_due_since = NULL,
        grace_period_ends_at = NULL,
        next_billing_at = GREATEST(next_billing_at, now()) + INTERVAL '1 month',
        updated_at = now()
    WHERE id = v_sub.id;
    RETURN;
  END IF;

  IF v_sub.past_due_since IS NULL THEN
    UPDATE public.subscriptions
    SET past_due_since = now(),
        grace_period_ends_at = now() + INTERVAL '7 days',
        updated_at = now()
    WHERE id = v_sub.id;

    PERFORM public.insert_pt_billing_event(
      _pt_user_id, v_sub.id, NULL, 'grace_started', v_sub.plan_id, v_sub.plan_id,
      v_sub.current_athlete_count, '{}'::jsonb
    );
    RETURN;
  END IF;

  IF v_sub.grace_period_ends_at IS NOT NULL AND v_sub.grace_period_ends_at < now() THEN
    UPDATE public.subscriptions
    SET status = 'bloccato',
        updated_at = now()
    WHERE id = v_sub.id;

    PERFORM public.insert_pt_billing_event(
      _pt_user_id, v_sub.id, NULL, 'blocked', v_sub.plan_id, v_sub.plan_id,
      v_sub.current_athlete_count, '{}'::jsonb
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_pt_billing_tier(_pt_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub_id UUID;
  v_count INTEGER;
  v_required UUID;
  v_current UUID;
  v_current_price NUMERIC;
  v_required_price NUMERIC;
  v_downgraded INTEGER;
BEGIN
  -- Nessun check auth.uid()=PT: il trigger connessioni gira anche come atleta.
  v_sub_id := public.ensure_pt_platform_subscription(_pt_user_id);
  IF v_sub_id IS NULL THEN
    RETURN;
  END IF;

  v_count := public.count_pt_active_athletes(_pt_user_id);
  v_required := public.get_pt_plan_id_for_count(v_count);
  IF v_required IS NULL THEN
    SELECT id INTO v_required FROM public.subscription_plans WHERE slug = 'starter' LIMIT 1;
  END IF;

  SELECT plan_id INTO v_current
  FROM public.subscriptions WHERE id = v_sub_id;

  SELECT price_monthly INTO v_current_price FROM public.subscription_plans WHERE id = v_current;
  SELECT price_monthly INTO v_required_price FROM public.subscription_plans WHERE id = v_required;

  UPDATE public.subscriptions
  SET current_athlete_count = v_count,
      required_plan_id = v_required,
      billed_athlete_count = COALESCE(billed_athlete_count, v_count),
      updated_at = now()
  WHERE id = v_sub_id;

  -- Discesa: programma, applica solo a scadenza periodo
  IF COALESCE(v_required_price, 0) < COALESCE(v_current_price, 0) THEN
    UPDATE public.subscriptions
    SET scheduled_downgrade_plan_id = v_required,
        updated_at = now()
    WHERE id = v_sub_id
      AND scheduled_downgrade_plan_id IS DISTINCT FROM v_required;

    IF FOUND THEN
      PERFORM public.insert_pt_billing_event(
        _pt_user_id, v_sub_id, NULL, 'tier_down_scheduled', v_current, v_required, v_count, '{}'::jsonb
      );
    END IF;
  END IF;

  IF COALESCE(v_required_price, 0) >= COALESCE(v_current_price, 0) THEN
    UPDATE public.subscriptions
    SET scheduled_downgrade_plan_id = NULL,
        updated_at = now()
    WHERE id = v_sub_id
      AND scheduled_downgrade_plan_id IS NOT NULL;
  END IF;

  -- Applica downgrade se il periodo è scaduto e non past-due (o free)
  UPDATE public.subscriptions s
  SET plan_id = s.scheduled_downgrade_plan_id,
      subscription_type = p.plan_type,
      price_monthly = p.price_monthly,
      billed_athlete_count = v_count,
      scheduled_downgrade_plan_id = NULL,
      next_billing_at = CASE WHEN COALESCE(p.price_monthly, 0) > 0 THEN now() + INTERVAL '1 month' ELSE NULL END,
      updated_at = now()
  FROM public.subscription_plans p
  WHERE s.id = v_sub_id
    AND s.scheduled_downgrade_plan_id IS NOT NULL
    AND p.id = s.scheduled_downgrade_plan_id
    AND (
      s.next_billing_at IS NULL
      OR s.next_billing_at <= now()
    )
    AND s.status IN ('attivo', 'trial')
    AND s.past_due_since IS NULL;

  GET DIAGNOSTICS v_downgraded = ROW_COUNT;
  IF v_downgraded > 0 THEN
    PERFORM public.insert_pt_billing_event(
      _pt_user_id, v_sub_id, NULL, 'tier_down', v_current, v_required, v_count, '{}'::jsonb
    );
  END IF;

  PERFORM public.enforce_pt_past_due_one(_pt_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_pt_billing_on_connection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_pt_billing_tier(OLD.pt_user_id);
    RETURN OLD;
  END IF;

  PERFORM public.sync_pt_billing_tier(NEW.pt_user_id);

  IF TG_OP = 'UPDATE' AND OLD.pt_user_id IS DISTINCT FROM NEW.pt_user_id THEN
    PERFORM public.sync_pt_billing_tier(OLD.pt_user_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_pt_billing_on_connection ON public.pt_atleta_connections;
CREATE TRIGGER trigger_sync_pt_billing_on_connection
  AFTER INSERT OR UPDATE OF status, pt_user_id OR DELETE
  ON public.pt_atleta_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_pt_billing_on_connection();

CREATE OR REPLACE FUNCTION public.can_pt_accept_athletes(_pt_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_status public.subscription_status;
  v_past_due TIMESTAMPTZ;
  v_max INTEGER;
BEGIN
  v_count := public.count_pt_active_athletes(_pt_user_id);

  SELECT s.status, s.past_due_since, p.max_athletes
  INTO v_status, v_past_due, v_max
  FROM public.subscriptions s
  LEFT JOIN public.subscription_plans p ON p.id = s.plan_id
  WHERE s.user_id = _pt_user_id
    AND s.subscription_type IN ('pt_base', 'pt_premium')
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_status = 'bloccato' THEN
    RETURN false;
  END IF;

  IF v_past_due IS NOT NULL THEN
    RETURN false;
  END IF;

  IF v_status IS NULL THEN
    v_max := 5;
  END IF;

  IF v_max IS NULL THEN
    RETURN true;
  END IF;

  RETURN v_count < v_max;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pt_billing_overview(_pt_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_sub public.subscriptions%ROWTYPE;
  v_current public.subscription_plans%ROWTYPE;
  v_required public.subscription_plans%ROWTYPE;
  v_pending public.subscription_plans%ROWTYPE;
  v_can BOOLEAN;
  v_plans JSONB;
BEGIN
  v_uid := COALESCE(_pt_user_id, auth.uid());

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF auth.uid() IS DISTINCT FROM v_uid AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  PERFORM public.sync_pt_billing_tier(v_uid);

  SELECT * INTO v_sub
  FROM public.subscriptions
  WHERE user_id = v_uid
    AND subscription_type IN ('pt_base', 'pt_premium')
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    SELECT * INTO v_current FROM public.subscription_plans WHERE id = v_sub.plan_id;
    SELECT * INTO v_required FROM public.subscription_plans WHERE id = v_sub.required_plan_id;
    SELECT * INTO v_pending FROM public.subscription_plans WHERE id = v_sub.pending_plan_id;
  END IF;

  v_can := public.can_pt_accept_athletes(v_uid);

  SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.sort_order), '[]'::jsonb)
  INTO v_plans
  FROM public.subscription_plans p
  WHERE p.target_role = 'pt' AND p.is_active = true AND p.slug IS NOT NULL;

  RETURN jsonb_build_object(
    'athlete_count', COALESCE(v_sub.current_athlete_count, public.count_pt_active_athletes(v_uid)),
    'can_accept', v_can,
    'subscription', to_jsonb(v_sub),
    'current_plan', to_jsonb(v_current),
    'required_plan', to_jsonb(v_required),
    'pending_plan', to_jsonb(v_pending),
    'plans', v_plans
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.request_pt_plan_upgrade(_plan_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_plan public.subscription_plans%ROWTYPE;
  v_sub_id UUID;
  v_sub public.subscriptions%ROWTYPE;
  v_pay_id UUID;
  v_count INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT public.has_role(v_uid, 'pt') THEN
    RAISE EXCEPTION 'only PT';
  END IF;

  SELECT * INTO v_plan
  FROM public.subscription_plans
  WHERE id = _plan_id AND target_role = 'pt' AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'piano non valido';
  END IF;

  IF COALESCE(v_plan.price_monthly, 0) <= 0 THEN
    RAISE EXCEPTION 'il piano gratuito si attiva automaticamente';
  END IF;

  PERFORM public.sync_pt_billing_tier(v_uid);
  v_sub_id := public.ensure_pt_platform_subscription(v_uid);

  SELECT * INTO v_sub FROM public.subscriptions WHERE id = v_sub_id;
  v_count := public.count_pt_active_athletes(v_uid);

  IF v_plan.max_athletes IS NOT NULL AND v_count > v_plan.max_athletes THEN
    RAISE EXCEPTION 'troppi atleti per questo piano';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.payments
    WHERE user_id = v_uid AND plan_id = _plan_id AND status = 'pending'
  ) THEN
    SELECT id INTO v_pay_id FROM public.payments
    WHERE user_id = v_uid AND plan_id = _plan_id AND status = 'pending'
    ORDER BY created_at DESC LIMIT 1;
  ELSE
    INSERT INTO public.payments (
      user_id, subscription_id, plan_id, amount, currency, status,
      description, athlete_count_snapshot, period_start, period_end
    ) VALUES (
      v_uid, v_sub_id, v_plan.id, v_plan.price_monthly, COALESCE(v_plan.currency, 'EUR'), 'pending',
      'Abbonamento ' || v_plan.name || ' — in attesa di Stripe',
      v_count, now(), now() + INTERVAL '1 month'
    )
    RETURNING id INTO v_pay_id;

    PERFORM public.insert_pt_billing_event(
      v_uid, v_sub_id, v_pay_id, 'payment_pending', v_sub.plan_id, v_plan.id, v_count, '{}'::jsonb
    );
  END IF;

  UPDATE public.subscriptions
  SET pending_plan_id = v_plan.id, updated_at = now()
  WHERE id = v_sub_id;

  PERFORM public.insert_pt_billing_event(
    v_uid, v_sub_id, v_pay_id, 'upgrade_requested', v_sub.plan_id, v_plan.id, v_count, '{}'::jsonb
  );

  RETURN jsonb_build_object('payment_id', v_pay_id, 'plan_id', v_plan.id, 'status', 'pending');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_complete_pt_payment(_payment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pay public.payments%ROWTYPE;
  v_plan public.subscription_plans%ROWTYPE;
  v_count INTEGER;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT * INTO v_pay FROM public.payments WHERE id = _payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'pagamento non trovato';
  END IF;

  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = v_pay.plan_id;
  v_count := public.count_pt_active_athletes(v_pay.user_id);

  UPDATE public.payments
  SET status = 'completed',
      paid_at = now(),
      payment_method = COALESCE(payment_method, 'bank_transfer'),
      updated_at = now()
  WHERE id = _payment_id;

  IF v_pay.subscription_id IS NOT NULL AND v_plan.id IS NOT NULL THEN
    UPDATE public.subscriptions
    SET plan_id = v_plan.id,
        pending_plan_id = NULL,
        subscription_type = v_plan.plan_type,
        price_monthly = v_plan.price_monthly,
        status = 'attivo',
        billed_athlete_count = v_count,
        current_athlete_count = v_count,
        past_due_since = NULL,
        grace_period_ends_at = NULL,
        next_billing_at = now() + INTERVAL '1 month',
        updated_at = now()
    WHERE id = v_pay.subscription_id;
  END IF;

  PERFORM public.insert_pt_billing_event(
    v_pay.user_id, v_pay.subscription_id, _payment_id, 'payment_completed',
    NULL, v_plan.id, v_count, '{}'::jsonb
  );
  PERFORM public.insert_pt_billing_event(
    v_pay.user_id, v_pay.subscription_id, _payment_id, 'tier_up',
    NULL, v_plan.id, v_count, '{}'::jsonb
  );
  PERFORM public.insert_pt_billing_event(
    v_pay.user_id, v_pay.subscription_id, _payment_id, 'unblocked',
    NULL, v_plan.id, v_count, '{}'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unblock_pt_billing(_pt_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub_id UUID;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT id INTO v_sub_id
  FROM public.subscriptions
  WHERE user_id = _pt_user_id
    AND subscription_type IN ('pt_base', 'pt_premium')
  ORDER BY created_at DESC
  LIMIT 1;

  UPDATE public.subscriptions
  SET status = 'attivo',
      past_due_since = NULL,
      grace_period_ends_at = NULL,
      updated_at = now()
  WHERE id = v_sub_id;

  PERFORM public.insert_pt_billing_event(
    _pt_user_id, v_sub_id, NULL, 'unblocked', NULL, NULL,
    public.count_pt_active_athletes(_pt_user_id), '{}'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_pt_past_due()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_n INTEGER := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  FOR v_row IN
    SELECT DISTINCT user_id
    FROM public.subscriptions
    WHERE subscription_type IN ('pt_base', 'pt_premium')
      AND COALESCE(price_monthly, 0) > 0
      AND next_billing_at IS NOT NULL
      AND next_billing_at <= now()
      AND status IN ('attivo', 'trial')
  LOOP
    PERFORM public.enforce_pt_past_due_one(v_row.user_id);
    v_n := v_n + 1;
  END LOOP;

  RETURN v_n;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_pt_billing_report()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mrr NUMERIC;
  v_by_plan JSONB;
  v_blocked INTEGER;
  v_grace INTEGER;
  v_pending INTEGER;
  v_failed INTEGER;
  v_near JSONB;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT COALESCE(SUM(s.price_monthly), 0) INTO v_mrr
  FROM public.subscriptions s
  WHERE s.status = 'attivo'
    AND s.subscription_type IN ('pt_base', 'pt_premium');

  SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) INTO v_by_plan
  FROM (
    SELECT p.slug, p.name, p.price_monthly,
           COUNT(s.id)::INTEGER AS subscribers,
           COALESCE(SUM(s.price_monthly), 0) AS mrr
    FROM public.subscription_plans p
    LEFT JOIN public.subscriptions s
      ON s.plan_id = p.id AND s.status = 'attivo'
    WHERE p.target_role = 'pt' AND p.slug IS NOT NULL AND p.is_active
    GROUP BY p.id, p.slug, p.name, p.price_monthly, p.sort_order
    ORDER BY p.sort_order
  ) x;

  SELECT COUNT(*)::INTEGER INTO v_blocked
  FROM public.subscriptions
  WHERE subscription_type IN ('pt_base', 'pt_premium') AND status = 'bloccato';

  SELECT COUNT(*)::INTEGER INTO v_grace
  FROM public.subscriptions
  WHERE subscription_type IN ('pt_base', 'pt_premium')
    AND past_due_since IS NOT NULL
    AND status <> 'bloccato';

  SELECT COUNT(*)::INTEGER INTO v_pending
  FROM public.payments
  WHERE status = 'pending';

  SELECT COUNT(*)::INTEGER INTO v_failed
  FROM public.payments
  WHERE status = 'failed'
    AND created_at >= date_trunc('month', now());

  SELECT COALESCE(jsonb_agg(row_to_json(n)), '[]'::jsonb) INTO v_near
  FROM (
    SELECT s.user_id,
           s.current_athlete_count,
           p.max_athletes,
           p.slug,
           p.name AS plan_name,
           pr.first_name,
           pr.last_name,
           pr.email
    FROM public.subscriptions s
    JOIN public.subscription_plans p ON p.id = s.plan_id
    LEFT JOIN public.profiles pr ON pr.user_id = s.user_id
    WHERE s.subscription_type IN ('pt_base', 'pt_premium')
      AND s.status IN ('attivo', 'trial')
      AND p.max_athletes IS NOT NULL
      AND s.current_athlete_count >= GREATEST(p.max_athletes - 2, 0)
    ORDER BY s.current_athlete_count DESC
    LIMIT 50
  ) n;

  RETURN jsonb_build_object(
    'mrr', v_mrr,
    'by_plan', v_by_plan,
    'blocked', v_blocked,
    'grace', v_grace,
    'pending_payments', v_pending,
    'failed_this_month', v_failed,
    'near_limit', v_near
  );
END;
$$;

-- Backfill abbonamenti PT esistenti
UPDATE public.subscriptions s
SET plan_id = COALESCE(
      s.plan_id,
      public.get_pt_plan_id_for_count(public.count_pt_active_athletes(s.user_id))
    ),
    required_plan_id = public.get_pt_plan_id_for_count(public.count_pt_active_athletes(s.user_id)),
    current_athlete_count = public.count_pt_active_athletes(s.user_id),
    billed_athlete_count = COALESCE(s.billed_athlete_count, public.count_pt_active_athletes(s.user_id)),
    updated_at = now()
WHERE s.subscription_type IN ('pt_base', 'pt_premium');

REVOKE ALL ON FUNCTION public.insert_pt_billing_event(UUID, UUID, UUID, TEXT, UUID, UUID, INTEGER, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_pt_platform_subscription(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_pt_billing_tier(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_pt_past_due_one(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_pt_plan_id_for_count(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_pt_accept_athletes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pt_billing_overview(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_pt_plan_upgrade(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_complete_pt_payment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unblock_pt_billing(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_pt_past_due() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_pt_billing_report() TO authenticated;
