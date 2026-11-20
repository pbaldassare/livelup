-- Temporary Starter cap: 100 active athletes (was 5).
-- Collaborator owner can recall every athlete from one destination PT.
-- Destination PT can return a received athlete to the owner.

UPDATE public.subscription_plans
SET
  max_athletes = 100,
  description = 'Fino a 100 atleti attivi. Piano gratuito temporaneo.',
  features = '["Fino a 100 atleti attivi","Schede, chat e calendario","Storico atleti conservato"]'::jsonb,
  updated_at = now()
WHERE slug = 'starter' AND target_role = 'pt';

-- Helper used by recall/return; missing after some restores.
CREATE OR REPLACE FUNCTION public._terminate_pt_atleta_connection(
  _pt_user_id UUID,
  _atleta_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.pt_atleta_connections
  SET
    status = 'terminated',
    terminated_at = now(),
    is_primary = false,
    updated_at = now()
  WHERE pt_user_id = _pt_user_id
    AND atleta_user_id = _atleta_user_id
    AND status = 'active';
END;
$$;

REVOKE ALL ON FUNCTION public._terminate_pt_atleta_connection(UUID, UUID) FROM PUBLIC;

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
    v_max := 100;
  END IF;

  IF v_max IS NULL THEN
    RETURN true;
  END IF;

  RETURN v_count < v_max;
END;
$$;

CREATE OR REPLACE FUNCTION public.recall_athletes_from_collaborator(
  _collaborator_pt_user_id UUID,
  _notes TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID := auth.uid();
  v_count INTEGER := 0;
  v_athlete UUID;
BEGIN
  IF v_owner IS NULL OR NOT public.is_pt(v_owner) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  IF _collaborator_pt_user_id IS NULL THEN
    RAISE EXCEPTION 'Collaboratore obbligatorio';
  END IF;

  IF _collaborator_pt_user_id = v_owner THEN
    RAISE EXCEPTION 'Non puoi togliere te stesso';
  END IF;

  FOR v_athlete IN
    SELECT DISTINCT t.atleta_user_id
    FROM public.pt_atleta_transfers t
    WHERE t.from_pt_user_id = v_owner
      AND t.to_pt_user_id = _collaborator_pt_user_id
      AND t.action = 'transfer_out'
      AND t.status = 'completed'
      AND NOT EXISTS (
        SELECT 1
        FROM public.pt_atleta_transfers r
        WHERE r.atleta_user_id = t.atleta_user_id
          AND r.action = 'recall'
          AND r.status = 'completed'
          AND COALESCE(r.completed_at, r.created_at) >= COALESCE(t.completed_at, t.created_at)
      )
      AND EXISTS (
        SELECT 1
        FROM public.pt_atleta_connections c
        WHERE c.pt_user_id = _collaborator_pt_user_id
          AND c.atleta_user_id = t.atleta_user_id
          AND c.status = 'active'
      )
  LOOP
    PERFORM public.recall_athlete_from_transfer(v_athlete, _notes);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recall_athletes_from_collaborator(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.return_received_athlete(
  _atleta_user_id UUID,
  _notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_returning_pt UUID := auth.uid();
  v_transfer_id UUID;
  v_last_in RECORD;
  v_last_recall TIMESTAMPTZ;
  v_dest_active BOOLEAN;
  v_owner UUID;
BEGIN
  IF v_returning_pt IS NULL OR NOT public.is_pt(v_returning_pt) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  IF _atleta_user_id IS NULL THEN
    RAISE EXCEPTION 'Atleta obbligatorio';
  END IF;

  SELECT t.from_pt_user_id, t.to_pt_user_id, t.completed_at
  INTO v_last_in
  FROM public.pt_atleta_transfers t
  WHERE t.to_pt_user_id = v_returning_pt
    AND t.atleta_user_id = _atleta_user_id
    AND t.action = 'transfer_out'
    AND t.status = 'completed'
  ORDER BY t.completed_at DESC NULLS LAST, t.created_at DESC
  LIMIT 1;

  IF v_last_in IS NULL THEN
    RAISE EXCEPTION 'Nessuna cessione ricevuta per questo atleta';
  END IF;

  v_owner := v_last_in.from_pt_user_id;

  SELECT t.completed_at INTO v_last_recall
  FROM public.pt_atleta_transfers t
  WHERE t.atleta_user_id = _atleta_user_id
    AND t.action = 'recall'
    AND t.status = 'completed'
    AND (
      (t.from_pt_user_id = v_returning_pt AND t.to_pt_user_id = v_owner)
      OR (t.to_pt_user_id = v_owner AND t.from_pt_user_id = v_returning_pt)
    )
  ORDER BY t.completed_at DESC NULLS LAST, t.created_at DESC
  LIMIT 1;

  IF v_last_recall IS NOT NULL AND v_last_recall >= v_last_in.completed_at THEN
    RAISE EXCEPTION 'Atleta già restituito o ripreso';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.pt_atleta_connections
    WHERE pt_user_id = v_returning_pt
      AND atleta_user_id = _atleta_user_id
      AND status = 'active'
  ) INTO v_dest_active;

  IF NOT v_dest_active THEN
    RAISE EXCEPTION 'Atleta non più collegato al tuo profilo';
  END IF;

  PERFORM public._terminate_pt_atleta_connection(v_returning_pt, _atleta_user_id);
  PERFORM public._activate_pt_atleta_connection(v_owner, _atleta_user_id, v_owner);

  INSERT INTO public.pt_athlete_owners (atleta_user_id, owner_pt_user_id)
  VALUES (_atleta_user_id, v_owner)
  ON CONFLICT (atleta_user_id) DO UPDATE
    SET owner_pt_user_id = EXCLUDED.owner_pt_user_id,
        updated_at = now();

  INSERT INTO public.pt_atleta_transfers (
    atleta_user_id,
    from_pt_user_id,
    to_pt_user_id,
    action,
    status,
    requested_at,
    completed_at,
    notes
  ) VALUES (
    _atleta_user_id,
    v_returning_pt,
    v_owner,
    'recall',
    'completed',
    now(),
    now(),
    NULLIF(trim(_notes), '')
  )
  RETURNING id INTO v_transfer_id;

  RETURN v_transfer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.return_received_athlete(UUID, TEXT) TO authenticated;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT user_id
    FROM public.subscriptions
    WHERE subscription_type IN ('pt_base', 'pt_premium')
  LOOP
    PERFORM public.sync_pt_billing_tier(r.user_id);
  END LOOP;
END
$$;
