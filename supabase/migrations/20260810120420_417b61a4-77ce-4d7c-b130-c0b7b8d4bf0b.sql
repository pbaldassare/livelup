-- =====================================================
-- Ceded athlete: shared coaching, ownership stays with titolare
-- =====================================================

COMMENT ON TABLE public.pt_athlete_owners IS
  'PT titolare dell''atleta: unico che può cedere, riprendere, gestire abbonamenti/pagamenti e ownership. Dopo una cessione l''ownership resta sul titolare; il destinatario coacha via connessione attiva.';

DROP POLICY IF EXISTS "Connected can view athlete ownership" ON public.pt_athlete_owners;
CREATE POLICY "Connected can view athlete ownership"
  ON public.pt_athlete_owners FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR owner_pt_user_id = auth.uid()
    OR atleta_user_id = auth.uid()
    OR public.are_connected(auth.uid(), atleta_user_id)
  );

CREATE OR REPLACE FUNCTION public.is_athlete_owner(
  _atleta_user_id UUID,
  _pt_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pt_athlete_owners o
    WHERE o.atleta_user_id = _atleta_user_id
      AND o.owner_pt_user_id = _pt_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_athlete_owner(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public._ensure_athlete_owner(
  _atleta_user_id UUID,
  _owner_pt_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
BEGIN
  v_owner := public.get_athlete_owner_pt(_atleta_user_id);
  IF v_owner IS NOT NULL THEN
    RETURN v_owner;
  END IF;

  INSERT INTO public.pt_athlete_owners (atleta_user_id, owner_pt_user_id)
  VALUES (_atleta_user_id, _owner_pt_user_id)
  ON CONFLICT (atleta_user_id) DO NOTHING;

  RETURN COALESCE(public.get_athlete_owner_pt(_atleta_user_id), _owner_pt_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public._ensure_athlete_owner(UUID, UUID) FROM PUBLIC;

-- =====================================================
-- transfer_athlete_to_pt — shared coaching, ownership stays
-- =====================================================

CREATE OR REPLACE FUNCTION public.transfer_athlete_to_pt(
  _atleta_user_id UUID,
  _to_pt_user_id UUID,
  _notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_pt UUID := auth.uid();
  v_transfer_id UUID;
  v_has_active BOOLEAN;
  v_owner UUID;
BEGIN
  IF v_from_pt IS NULL OR NOT public.is_pt(v_from_pt) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  IF _atleta_user_id IS NULL OR _to_pt_user_id IS NULL THEN
    RAISE EXCEPTION 'Atleta e PT destinatario obbligatori';
  END IF;

  IF v_from_pt = _to_pt_user_id THEN
    RAISE EXCEPTION 'Non puoi cedere un atleta a te stesso';
  END IF;

  IF NOT public.is_atleta(_atleta_user_id) THEN
    RAISE EXCEPTION 'Utente atleta non valido';
  END IF;

  IF NOT public.is_pt(_to_pt_user_id) THEN
    RAISE EXCEPTION 'PT destinatario non valido';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.pt_atleta_connections
    WHERE pt_user_id = v_from_pt
      AND atleta_user_id = _atleta_user_id
      AND status = 'active'
  ) INTO v_has_active;

  IF NOT v_has_active THEN
    RAISE EXCEPTION 'Non hai una connessione attiva con questo atleta';
  END IF;

  v_owner := public._ensure_athlete_owner(_atleta_user_id, v_from_pt);

  IF v_owner <> v_from_pt THEN
    RAISE EXCEPTION 'Solo il PT titolare può cedere questo atleta';
  END IF;

  IF NOT public.can_pt_accept_athletes(_to_pt_user_id) THEN
    RAISE EXCEPTION 'Il PT destinatario ha raggiunto il numero massimo di atleti';
  END IF;

  UPDATE public.pt_athlete_collaborator_assignments
  SET status = 'revoked', revoked_at = now(), updated_at = now()
  WHERE owner_pt_user_id = v_owner
    AND atleta_user_id = _atleta_user_id
    AND status = 'active';

  PERFORM public._activate_pt_atleta_connection(_to_pt_user_id, _atleta_user_id, v_from_pt);
  PERFORM public._activate_pt_atleta_connection(v_from_pt, _atleta_user_id, v_from_pt);

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
    v_from_pt,
    _to_pt_user_id,
    'transfer_out',
    'completed',
    now(),
    now(),
    NULLIF(trim(_notes), '')
  )
  RETURNING id INTO v_transfer_id;

  RETURN v_transfer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_athlete_to_pt(UUID, UUID, TEXT) TO authenticated;

-- =====================================================
-- recall_athlete_from_transfer — owner-only, drop destination
-- =====================================================

CREATE OR REPLACE FUNCTION public.recall_athlete_from_transfer(
  _atleta_user_id UUID,
  _notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recalling_pt UUID := auth.uid();
  v_transfer_id UUID;
  v_owner UUID;
  v_last_out RECORD;
  v_last_recall TIMESTAMPTZ;
  v_dest_active BOOLEAN;
BEGIN
  IF v_recalling_pt IS NULL OR NOT public.is_pt(v_recalling_pt) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  IF _atleta_user_id IS NULL THEN
    RAISE EXCEPTION 'Atleta obbligatorio';
  END IF;

  v_owner := public.get_athlete_owner_pt(_atleta_user_id);
  IF v_owner IS NULL OR v_owner <> v_recalling_pt THEN
    RAISE EXCEPTION 'Solo il PT titolare può riprendere questo atleta';
  END IF;

  SELECT t.to_pt_user_id, t.completed_at
  INTO v_last_out
  FROM public.pt_atleta_transfers t
  WHERE t.from_pt_user_id = v_recalling_pt
    AND t.atleta_user_id = _atleta_user_id
    AND t.action = 'transfer_out'
    AND t.status = 'completed'
  ORDER BY t.completed_at DESC NULLS LAST, t.created_at DESC
  LIMIT 1;

  IF v_last_out IS NULL THEN
    RAISE EXCEPTION 'Nessuna cessione trovata per questo atleta';
  END IF;

  SELECT t.completed_at INTO v_last_recall
  FROM public.pt_atleta_transfers t
  WHERE t.to_pt_user_id = v_recalling_pt
    AND t.atleta_user_id = _atleta_user_id
    AND t.action = 'recall'
    AND t.status = 'completed'
  ORDER BY t.completed_at DESC NULLS LAST, t.created_at DESC
  LIMIT 1;

  IF v_last_recall IS NOT NULL AND v_last_recall >= v_last_out.completed_at THEN
    RAISE EXCEPTION 'Atleta già ripreso';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.pt_atleta_connections
    WHERE pt_user_id = v_last_out.to_pt_user_id
      AND atleta_user_id = _atleta_user_id
      AND status = 'active'
  ) INTO v_dest_active;

  IF NOT v_dest_active THEN
    RAISE EXCEPTION 'Atleta non più collegato al professionista destinatario';
  END IF;

  PERFORM public._terminate_pt_atleta_connection(v_last_out.to_pt_user_id, _atleta_user_id);
  PERFORM public._activate_pt_atleta_connection(v_recalling_pt, _atleta_user_id, v_recalling_pt);

  INSERT INTO public.pt_athlete_owners (atleta_user_id, owner_pt_user_id)
  VALUES (_atleta_user_id, v_recalling_pt)
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
    v_last_out.to_pt_user_id,
    v_recalling_pt,
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

GRANT EXECUTE ON FUNCTION public.recall_athlete_from_transfer(UUID, TEXT) TO authenticated;

-- =====================================================
-- Ceduti / Riprendibili
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_ceded_athletes_for_pt()
RETURNS TABLE (
  atleta_user_id UUID,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  email TEXT,
  training_modality TEXT,
  fitness_level TEXT,
  current_pt_user_id UUID,
  current_pt_first_name TEXT,
  current_pt_last_name TEXT,
  transferred_at TIMESTAMPTZ,
  is_recallable BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pt_id UUID := auth.uid();
BEGIN
  IF v_pt_id IS NULL OR NOT public.is_pt(v_pt_id) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  RETURN QUERY
  WITH latest_out AS (
    SELECT DISTINCT ON (t.atleta_user_id)
      t.atleta_user_id,
      t.to_pt_user_id,
      t.completed_at
    FROM public.pt_atleta_transfers t
    WHERE t.from_pt_user_id = v_pt_id
      AND t.action = 'transfer_out'
      AND t.status = 'completed'
    ORDER BY t.atleta_user_id, t.completed_at DESC NULLS LAST, t.created_at DESC
  ),
  later_recall AS (
    SELECT DISTINCT ON (t.atleta_user_id)
      t.atleta_user_id,
      t.completed_at
    FROM public.pt_atleta_transfers t
    WHERE t.to_pt_user_id = v_pt_id
      AND t.action = 'recall'
      AND t.status = 'completed'
    ORDER BY t.atleta_user_id, t.completed_at DESC NULLS LAST, t.created_at DESC
  )
  SELECT
    lo.atleta_user_id,
    ap.first_name,
    ap.last_name,
    ap.avatar_url,
    ap.email,
    COALESCE(dest.training_modality, owner_conn.training_modality, 'mix') AS training_modality,
    atl.fitness_level,
    dest.pt_user_id AS current_pt_user_id,
    cp.first_name AS current_pt_first_name,
    cp.last_name AS current_pt_last_name,
    lo.completed_at AS transferred_at,
    (
      dest.pt_user_id IS NOT NULL
      AND dest.status = 'active'
      AND (lr.completed_at IS NULL OR lr.completed_at < lo.completed_at)
    ) AS is_recallable
  FROM latest_out lo
  LEFT JOIN later_recall lr ON lr.atleta_user_id = lo.atleta_user_id
  INNER JOIN public.profiles ap ON ap.user_id = lo.atleta_user_id
  LEFT JOIN public.atleta_profiles atl ON atl.user_id = lo.atleta_user_id
  LEFT JOIN public.pt_atleta_connections dest
    ON dest.atleta_user_id = lo.atleta_user_id
    AND dest.pt_user_id = lo.to_pt_user_id
    AND dest.status = 'active'
  LEFT JOIN public.profiles cp ON cp.user_id = dest.pt_user_id
  LEFT JOIN public.pt_atleta_connections owner_conn
    ON owner_conn.atleta_user_id = lo.atleta_user_id
    AND owner_conn.pt_user_id = v_pt_id
  WHERE lr.completed_at IS NULL OR lr.completed_at < lo.completed_at
  ORDER BY lo.completed_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ceded_athletes_for_pt() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_recallable_athletes_for_pt()
RETURNS TABLE (
  atleta_user_id UUID,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  current_pt_user_id UUID,
  current_pt_first_name TEXT,
  current_pt_last_name TEXT,
  transferred_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pt_id UUID := auth.uid();
BEGIN
  IF v_pt_id IS NULL OR NOT public.is_pt(v_pt_id) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  RETURN QUERY
  WITH latest_transfers AS (
    SELECT DISTINCT ON (t.atleta_user_id)
      t.atleta_user_id,
      t.to_pt_user_id,
      t.completed_at
    FROM public.pt_atleta_transfers t
    WHERE t.from_pt_user_id = v_pt_id
      AND t.action = 'transfer_out'
      AND t.status = 'completed'
    ORDER BY t.atleta_user_id, t.completed_at DESC NULLS LAST, t.created_at DESC
  ),
  later_recall AS (
    SELECT DISTINCT ON (t.atleta_user_id)
      t.atleta_user_id,
      t.completed_at
    FROM public.pt_atleta_transfers t
    WHERE t.to_pt_user_id = v_pt_id
      AND t.action = 'recall'
      AND t.status = 'completed'
    ORDER BY t.atleta_user_id, t.completed_at DESC NULLS LAST, t.created_at DESC
  )
  SELECT
    lt.atleta_user_id,
    ap.first_name,
    ap.last_name,
    ap.avatar_url,
    c.pt_user_id AS current_pt_user_id,
    cp.first_name AS current_pt_first_name,
    cp.last_name AS current_pt_last_name,
    lt.completed_at AS transferred_at
  FROM latest_transfers lt
  LEFT JOIN later_recall lr ON lr.atleta_user_id = lt.atleta_user_id
  INNER JOIN public.pt_atleta_connections c
    ON c.atleta_user_id = lt.atleta_user_id
    AND c.status = 'active'
    AND c.pt_user_id = lt.to_pt_user_id
  INNER JOIN public.profiles ap ON ap.user_id = lt.atleta_user_id
  INNER JOIN public.profiles cp ON cp.user_id = c.pt_user_id
  WHERE lr.completed_at IS NULL OR lr.completed_at < lt.completed_at
  ORDER BY lt.completed_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_recallable_athletes_for_pt() TO authenticated;

CREATE OR REPLACE FUNCTION public.transfer_athletes_to_pt(
  _atleta_user_ids UUID[],
  _to_pt_user_id UUID,
  _notes TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_count INTEGER := 0;
BEGIN
  IF _atleta_user_ids IS NULL OR cardinality(_atleta_user_ids) = 0 THEN
    RAISE EXCEPTION 'Seleziona almeno un atleta';
  END IF;

  FOREACH v_id IN ARRAY _atleta_user_ids
  LOOP
    PERFORM public.transfer_athlete_to_pt(v_id, _to_pt_user_id, _notes);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_athletes_to_pt(UUID[], UUID, TEXT) TO authenticated;

-- =====================================================
-- Subscriptions: only titolare can create/update/delete
-- =====================================================

DROP POLICY IF EXISTS "PT can view and manage subscriptions" ON public.atleta_pt_subscriptions;

DROP POLICY IF EXISTS "PT can view own athlete subscriptions" ON public.atleta_pt_subscriptions;
CREATE POLICY "PT can view own athlete subscriptions"
  ON public.atleta_pt_subscriptions FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR (
      public.is_pt(auth.uid())
      AND auth.uid() = pt_user_id
    )
  );

DROP POLICY IF EXISTS "Owner PT can insert athlete subscriptions" ON public.atleta_pt_subscriptions;
CREATE POLICY "Owner PT can insert athlete subscriptions"
  ON public.atleta_pt_subscriptions FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    OR (
      public.is_pt(auth.uid())
      AND auth.uid() = pt_user_id
      AND public.is_athlete_owner(atleta_user_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owner PT can update athlete subscriptions" ON public.atleta_pt_subscriptions;
CREATE POLICY "Owner PT can update athlete subscriptions"
  ON public.atleta_pt_subscriptions FOR UPDATE TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR (
      public.is_pt(auth.uid())
      AND auth.uid() = pt_user_id
      AND public.is_athlete_owner(atleta_user_id, auth.uid())
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR (
      public.is_pt(auth.uid())
      AND auth.uid() = pt_user_id
      AND public.is_athlete_owner(atleta_user_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owner PT can delete athlete subscriptions" ON public.atleta_pt_subscriptions;
CREATE POLICY "Owner PT can delete athlete subscriptions"
  ON public.atleta_pt_subscriptions FOR DELETE TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR (
      public.is_pt(auth.uid())
      AND auth.uid() = pt_user_id
      AND public.is_athlete_owner(atleta_user_id, auth.uid())
    )
  );

-- =====================================================
-- Data fix for already-ceded athletes
-- =====================================================

WITH latest_out AS (
  SELECT DISTINCT ON (t.atleta_user_id)
    t.atleta_user_id,
    t.from_pt_user_id,
    t.to_pt_user_id,
    t.completed_at
  FROM public.pt_atleta_transfers t
  WHERE t.action = 'transfer_out'
    AND t.status = 'completed'
  ORDER BY t.atleta_user_id, t.completed_at DESC NULLS LAST, t.created_at DESC
),
later_recall AS (
  SELECT DISTINCT ON (t.atleta_user_id)
    t.atleta_user_id,
    t.completed_at
  FROM public.pt_atleta_transfers t
  WHERE t.action = 'recall'
    AND t.status = 'completed'
  ORDER BY t.atleta_user_id, t.completed_at DESC NULLS LAST, t.created_at DESC
),
active_cedes AS (
  SELECT lo.*
  FROM latest_out lo
  LEFT JOIN later_recall lr ON lr.atleta_user_id = lo.atleta_user_id
  WHERE lr.completed_at IS NULL OR lr.completed_at < lo.completed_at
)
UPDATE public.pt_athlete_owners o
SET owner_pt_user_id = ac.from_pt_user_id,
    updated_at = now()
FROM active_cedes ac
WHERE o.atleta_user_id = ac.atleta_user_id
  AND o.owner_pt_user_id = ac.to_pt_user_id;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    WITH latest_out AS (
      SELECT DISTINCT ON (t.atleta_user_id)
        t.atleta_user_id,
        t.from_pt_user_id,
        t.to_pt_user_id,
        t.completed_at
      FROM public.pt_atleta_transfers t
      WHERE t.action = 'transfer_out'
        AND t.status = 'completed'
      ORDER BY t.atleta_user_id, t.completed_at DESC NULLS LAST, t.created_at DESC
    ),
    later_recall AS (
      SELECT DISTINCT ON (t.atleta_user_id)
        t.atleta_user_id,
        t.completed_at
      FROM public.pt_atleta_transfers t
      WHERE t.action = 'recall'
        AND t.status = 'completed'
      ORDER BY t.atleta_user_id, t.completed_at DESC NULLS LAST, t.created_at DESC
    )
    SELECT lo.atleta_user_id, lo.from_pt_user_id, lo.to_pt_user_id
    FROM latest_out lo
    LEFT JOIN later_recall lr ON lr.atleta_user_id = lo.atleta_user_id
    WHERE lr.completed_at IS NULL OR lr.completed_at < lo.completed_at
  LOOP
    PERFORM public._activate_pt_atleta_connection(r.to_pt_user_id, r.atleta_user_id, r.from_pt_user_id);
    PERFORM public._activate_pt_atleta_connection(r.from_pt_user_id, r.atleta_user_id, r.from_pt_user_id);
  END LOOP;
END $$;