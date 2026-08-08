-- =====================================================
-- PT athlete ownership + collaborator assignments (option B)
-- Owner PT can assign / move / revoke athletes to collaborators.
-- Collaborators coach assigned athletes but cannot cedi (transfer).
-- =====================================================

-- ── Ownership ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pt_athlete_owners (
  atleta_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_pt_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pt_athlete_owners_owner
  ON public.pt_athlete_owners (owner_pt_user_id);

COMMENT ON TABLE public.pt_athlete_owners IS
  'PT proprietario dell''atleta (chi può assegnare collaboratori / cedere).';

ALTER TABLE public.pt_athlete_owners ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.pt_athlete_owners TO authenticated;
GRANT ALL ON public.pt_athlete_owners TO service_role;

DROP POLICY IF EXISTS "Owner PT can view own athlete ownership" ON public.pt_athlete_owners;
CREATE POLICY "Owner PT can view own athlete ownership"
  ON public.pt_athlete_owners FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR owner_pt_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Owner PT can insert ownership" ON public.pt_athlete_owners;
CREATE POLICY "Owner PT can insert ownership"
  ON public.pt_athlete_owners FOR INSERT TO authenticated
  WITH CHECK (
    public.is_pt(auth.uid())
    AND owner_pt_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Owner PT can update ownership" ON public.pt_athlete_owners;
CREATE POLICY "Owner PT can update ownership"
  ON public.pt_athlete_owners FOR UPDATE TO authenticated
  USING (owner_pt_user_id = auth.uid())
  WITH CHECK (owner_pt_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage athlete ownership" ON public.pt_athlete_owners;
CREATE POLICY "Admins can manage athlete ownership"
  ON public.pt_athlete_owners FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ── Collaborator assignments ───────────────────────────

CREATE TABLE IF NOT EXISTS public.pt_athlete_collaborator_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_pt_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collaborator_pt_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  atleta_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pt_athlete_collab_owner_ne_collab
    CHECK (owner_pt_user_id <> collaborator_pt_user_id),
  CONSTRAINT uq_pt_athlete_collab_triple
    UNIQUE (owner_pt_user_id, collaborator_pt_user_id, atleta_user_id)
);

CREATE INDEX IF NOT EXISTS idx_pt_athlete_collab_active
  ON public.pt_athlete_collaborator_assignments (
    owner_pt_user_id,
    collaborator_pt_user_id,
    atleta_user_id
  )
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_pt_athlete_collab_owner
  ON public.pt_athlete_collaborator_assignments (owner_pt_user_id, status);

CREATE INDEX IF NOT EXISTS idx_pt_athlete_collab_collaborator
  ON public.pt_athlete_collaborator_assignments (collaborator_pt_user_id, status);

CREATE INDEX IF NOT EXISTS idx_pt_athlete_collab_atleta
  ON public.pt_athlete_collaborator_assignments (atleta_user_id, status);

COMMENT ON TABLE public.pt_athlete_collaborator_assignments IS
  'Assegnazioni atleta → collaboratore PT gestite dal PT proprietario.';

ALTER TABLE public.pt_athlete_collaborator_assignments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.pt_athlete_collaborator_assignments TO authenticated;
GRANT ALL ON public.pt_athlete_collaborator_assignments TO service_role;

DROP POLICY IF EXISTS "Owner PT can select own collaborator assignments" ON public.pt_athlete_collaborator_assignments;
CREATE POLICY "Owner PT can select own collaborator assignments"
  ON public.pt_athlete_collaborator_assignments FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR owner_pt_user_id = auth.uid()
    OR collaborator_pt_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Owner PT can insert collaborator assignments" ON public.pt_athlete_collaborator_assignments;
CREATE POLICY "Owner PT can insert collaborator assignments"
  ON public.pt_athlete_collaborator_assignments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_pt(auth.uid())
    AND owner_pt_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Owner PT can update collaborator assignments" ON public.pt_athlete_collaborator_assignments;
CREATE POLICY "Owner PT can update collaborator assignments"
  ON public.pt_athlete_collaborator_assignments FOR UPDATE TO authenticated
  USING (owner_pt_user_id = auth.uid())
  WITH CHECK (owner_pt_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can select all collaborator assignments" ON public.pt_athlete_collaborator_assignments;
CREATE POLICY "Admins can select all collaborator assignments"
  ON public.pt_athlete_collaborator_assignments FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- ── Backfill ownership ─────────────────────────────────
-- 1) PT-created athletes (connection requested_by = that PT)
INSERT INTO public.pt_athlete_owners (atleta_user_id, owner_pt_user_id)
SELECT DISTINCT ON (c.atleta_user_id)
  c.atleta_user_id,
  c.pt_user_id
FROM public.pt_atleta_connections c
WHERE c.status = 'active'
  AND c.requested_by = c.pt_user_id
  AND public.is_pt(c.pt_user_id)
  AND public.is_atleta(c.atleta_user_id)
ORDER BY c.atleta_user_id, c.accepted_at ASC NULLS LAST, c.created_at ASC
ON CONFLICT (atleta_user_id) DO NOTHING;

-- 2) referred_by_pt when still connected
INSERT INTO public.pt_athlete_owners (atleta_user_id, owner_pt_user_id)
SELECT ap.user_id, ap.referred_by_pt
FROM public.atleta_profiles ap
INNER JOIN public.pt_atleta_connections c
  ON c.atleta_user_id = ap.user_id
  AND c.pt_user_id = ap.referred_by_pt
  AND c.status = 'active'
WHERE ap.referred_by_pt IS NOT NULL
  AND public.is_pt(ap.referred_by_pt)
ON CONFLICT (atleta_user_id) DO NOTHING;

-- 3) Remaining: primary active PT, else earliest active connection
INSERT INTO public.pt_athlete_owners (atleta_user_id, owner_pt_user_id)
SELECT DISTINCT ON (c.atleta_user_id)
  c.atleta_user_id,
  c.pt_user_id
FROM public.pt_atleta_connections c
WHERE c.status = 'active'
  AND public.is_pt(c.pt_user_id)
  AND public.is_atleta(c.atleta_user_id)
  AND NOT EXISTS (
    SELECT 1 FROM public.pt_athlete_owners o
    WHERE o.atleta_user_id = c.atleta_user_id
  )
ORDER BY c.atleta_user_id, c.is_primary DESC, c.accepted_at ASC NULLS LAST, c.created_at ASC
ON CONFLICT (atleta_user_id) DO NOTHING;

-- =====================================================
-- Helpers
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_athlete_owner_pt(_atleta_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT owner_pt_user_id
  FROM public.pt_athlete_owners
  WHERE atleta_user_id = _atleta_user_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_athlete_owner_pt(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.upsert_pt_athlete_owner(
  _atleta_user_id UUID,
  _owner_pt_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _atleta_user_id IS NULL OR _owner_pt_user_id IS NULL THEN
    RAISE EXCEPTION 'Atleta e PT proprietario obbligatori';
  END IF;

  IF NOT public.is_atleta(_atleta_user_id) THEN
    RAISE EXCEPTION 'Utente atleta non valido';
  END IF;

  IF NOT public.is_pt(_owner_pt_user_id) THEN
    RAISE EXCEPTION 'PT proprietario non valido';
  END IF;

  INSERT INTO public.pt_athlete_owners (atleta_user_id, owner_pt_user_id)
  VALUES (_atleta_user_id, _owner_pt_user_id)
  ON CONFLICT (atleta_user_id) DO UPDATE
    SET owner_pt_user_id = EXCLUDED.owner_pt_user_id,
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_pt_athlete_owner(UUID, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public._assert_athlete_owner(_atleta_user_id UUID, _pt_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
BEGIN
  v_owner := public.get_athlete_owner_pt(_atleta_user_id);
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Nessun PT proprietario registrato per questo atleta';
  END IF;
  IF v_owner <> _pt_user_id THEN
    RAISE EXCEPTION 'Solo il PT proprietario può gestire i collaboratori per questo atleta';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public._assert_athlete_owner(UUID, UUID) FROM PUBLIC;

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

-- =====================================================
-- assign_athlete_to_collaborators
-- =====================================================

CREATE OR REPLACE FUNCTION public.assign_athlete_to_collaborators(
  _atleta_user_id UUID,
  _collaborator_pt_ids UUID[],
  _notes TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID := auth.uid();
  v_collab UUID;
  v_count INTEGER := 0;
  v_notes TEXT := NULLIF(trim(COALESCE(_notes, '')), '');
BEGIN
  IF v_owner IS NULL OR NOT public.is_pt(v_owner) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  IF _atleta_user_id IS NULL THEN
    RAISE EXCEPTION 'Atleta obbligatorio';
  END IF;

  IF _collaborator_pt_ids IS NULL OR cardinality(_collaborator_pt_ids) = 0 THEN
    RAISE EXCEPTION 'Seleziona almeno un collaboratore';
  END IF;

  IF NOT public.is_atleta(_atleta_user_id) THEN
    RAISE EXCEPTION 'Utente atleta non valido';
  END IF;

  PERFORM public._assert_athlete_owner(_atleta_user_id, v_owner);

  IF NOT EXISTS (
    SELECT 1 FROM public.pt_atleta_connections
    WHERE pt_user_id = v_owner
      AND atleta_user_id = _atleta_user_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Devi avere una connessione attiva con questo atleta';
  END IF;

  FOREACH v_collab IN ARRAY _collaborator_pt_ids
  LOOP
    IF v_collab IS NULL OR v_collab = v_owner THEN
      CONTINUE;
    END IF;

    IF NOT public.is_pt(v_collab) THEN
      RAISE EXCEPTION 'Collaboratore non valido';
    END IF;

    IF NOT public.can_pt_accept_athletes(v_collab)
       AND NOT EXISTS (
         SELECT 1 FROM public.pt_atleta_connections
         WHERE pt_user_id = v_collab
           AND atleta_user_id = _atleta_user_id
           AND status = 'active'
       ) THEN
      RAISE EXCEPTION 'Un collaboratore ha raggiunto il numero massimo di atleti';
    END IF;

    INSERT INTO public.pt_athlete_collaborator_assignments (
      owner_pt_user_id,
      collaborator_pt_user_id,
      atleta_user_id,
      status,
      notes,
      assigned_at,
      revoked_at
    ) VALUES (
      v_owner,
      v_collab,
      _atleta_user_id,
      'active',
      v_notes,
      now(),
      NULL
    )
    ON CONFLICT (owner_pt_user_id, collaborator_pt_user_id, atleta_user_id)
    DO UPDATE SET
      status = 'active',
      assigned_at = CASE
        WHEN public.pt_athlete_collaborator_assignments.status = 'active'
          THEN public.pt_athlete_collaborator_assignments.assigned_at
        ELSE now()
      END,
      revoked_at = NULL,
      notes = COALESCE(EXCLUDED.notes, public.pt_athlete_collaborator_assignments.notes);

    -- Ensure active coaching connection for collaborator (multi-PT)
    PERFORM public._activate_pt_atleta_connection(v_collab, _atleta_user_id, v_owner);

    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Nessun collaboratore valido selezionato';
  END IF;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_athlete_to_collaborators(UUID, UUID[], TEXT) TO authenticated;

-- =====================================================
-- revoke_athlete_collaborator
-- =====================================================

CREATE OR REPLACE FUNCTION public.revoke_athlete_collaborator(
  _atleta_user_id UUID,
  _collaborator_pt_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID := auth.uid();
  v_updated INTEGER;
BEGIN
  IF v_owner IS NULL OR NOT public.is_pt(v_owner) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  IF _atleta_user_id IS NULL OR _collaborator_pt_id IS NULL THEN
    RAISE EXCEPTION 'Atleta e collaboratore obbligatori';
  END IF;

  PERFORM public._assert_athlete_owner(_atleta_user_id, v_owner);

  UPDATE public.pt_athlete_collaborator_assignments
  SET
    status = 'revoked',
    revoked_at = now()
  WHERE owner_pt_user_id = v_owner
    AND collaborator_pt_user_id = _collaborator_pt_id
    AND atleta_user_id = _atleta_user_id
    AND status = 'active';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Assegnazione collaboratore non trovata';
  END IF;

  PERFORM public._terminate_pt_atleta_connection(_collaborator_pt_id, _atleta_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_athlete_collaborator(UUID, UUID) TO authenticated;

-- =====================================================
-- move_athlete_collaborator
-- =====================================================

CREATE OR REPLACE FUNCTION public.move_athlete_collaborator(
  _atleta_user_id UUID,
  _from_collaborator_pt_id UUID,
  _to_collaborator_pt_id UUID,
  _notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID := auth.uid();
BEGIN
  IF v_owner IS NULL OR NOT public.is_pt(v_owner) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  IF _atleta_user_id IS NULL
     OR _from_collaborator_pt_id IS NULL
     OR _to_collaborator_pt_id IS NULL THEN
    RAISE EXCEPTION 'Atleta e collaboratori obbligatori';
  END IF;

  IF _from_collaborator_pt_id = _to_collaborator_pt_id THEN
    RAISE EXCEPTION 'Seleziona un collaboratore diverso';
  END IF;

  PERFORM public._assert_athlete_owner(_atleta_user_id, v_owner);

  PERFORM public.revoke_athlete_collaborator(_atleta_user_id, _from_collaborator_pt_id);
  PERFORM public.assign_athlete_to_collaborators(
    _atleta_user_id,
    ARRAY[_to_collaborator_pt_id],
    _notes
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.move_athlete_collaborator(UUID, UUID, UUID, TEXT) TO authenticated;

-- =====================================================
-- list_my_collaborator_roster
-- =====================================================

CREATE OR REPLACE FUNCTION public.list_my_collaborator_roster()
RETURNS TABLE (
  view_mode TEXT,
  owner_pt_user_id UUID,
  owner_first_name TEXT,
  owner_last_name TEXT,
  collaborator_pt_user_id UUID,
  collaborator_first_name TEXT,
  collaborator_last_name TEXT,
  collaborator_avatar_url TEXT,
  atleta_user_id UUID,
  atleta_first_name TEXT,
  atleta_last_name TEXT,
  atleta_avatar_url TEXT,
  assignment_id UUID,
  assigned_at TIMESTAMPTZ,
  notes TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pt UUID := auth.uid();
BEGIN
  IF v_pt IS NULL OR NOT public.is_pt(v_pt) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  RETURN QUERY
  SELECT *
  FROM (
    -- Owner view: athletes I assigned to collaborators
    SELECT
      'owner'::TEXT AS view_mode,
      a.owner_pt_user_id,
      op.first_name AS owner_first_name,
      op.last_name AS owner_last_name,
      a.collaborator_pt_user_id,
      cp.first_name AS collaborator_first_name,
      cp.last_name AS collaborator_last_name,
      cp.avatar_url AS collaborator_avatar_url,
      a.atleta_user_id,
      ap.first_name AS atleta_first_name,
      ap.last_name AS atleta_last_name,
      ap.avatar_url AS atleta_avatar_url,
      a.id AS assignment_id,
      a.assigned_at,
      a.notes
    FROM public.pt_athlete_collaborator_assignments a
    INNER JOIN public.profiles cp ON cp.user_id = a.collaborator_pt_user_id
    INNER JOIN public.profiles ap ON ap.user_id = a.atleta_user_id
    INNER JOIN public.profiles op ON op.user_id = a.owner_pt_user_id
    WHERE a.owner_pt_user_id = v_pt
      AND a.status = 'active'

    UNION ALL

    -- Collaborator view: athletes assigned to me by owners
    SELECT
      'collaborator'::TEXT AS view_mode,
      a.owner_pt_user_id,
      op.first_name AS owner_first_name,
      op.last_name AS owner_last_name,
      a.collaborator_pt_user_id,
      cp.first_name AS collaborator_first_name,
      cp.last_name AS collaborator_last_name,
      cp.avatar_url AS collaborator_avatar_url,
      a.atleta_user_id,
      ap.first_name AS atleta_first_name,
      ap.last_name AS atleta_last_name,
      ap.avatar_url AS atleta_avatar_url,
      a.id AS assignment_id,
      a.assigned_at,
      a.notes
    FROM public.pt_athlete_collaborator_assignments a
    INNER JOIN public.profiles cp ON cp.user_id = a.collaborator_pt_user_id
    INNER JOIN public.profiles ap ON ap.user_id = a.atleta_user_id
    INNER JOIN public.profiles op ON op.user_id = a.owner_pt_user_id
    WHERE a.collaborator_pt_user_id = v_pt
      AND a.owner_pt_user_id <> v_pt
      AND a.status = 'active'
  ) roster
  ORDER BY roster.collaborator_last_name NULLS LAST,
           roster.collaborator_first_name NULLS LAST,
           roster.atleta_last_name NULLS LAST,
           roster.atleta_first_name NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_my_collaborator_roster() TO authenticated;

-- =====================================================
-- Harden transfer_athlete_to_pt: only owner can cedi
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
    RAISE EXCEPTION 'Non puoi trasferire un atleta a te stesso';
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

  -- Collaborator (non-owner) cannot full-transfer
  v_owner := public.get_athlete_owner_pt(_atleta_user_id);
  IF v_owner IS NOT NULL AND v_owner <> v_from_pt THEN
    RAISE EXCEPTION 'Solo il PT proprietario può cedere questo atleta';
  END IF;

  IF NOT public.can_pt_accept_athletes(_to_pt_user_id) THEN
    RAISE EXCEPTION 'Il PT destinatario ha raggiunto il numero massimo di atleti';
  END IF;

  -- Revoke active collaborator assignments under current owner
  IF v_owner IS NOT NULL THEN
    UPDATE public.pt_athlete_collaborator_assignments
    SET status = 'revoked', revoked_at = now()
    WHERE owner_pt_user_id = v_owner
      AND atleta_user_id = _atleta_user_id
      AND status = 'active';
  END IF;

  PERFORM public._activate_pt_atleta_connection(_to_pt_user_id, _atleta_user_id, v_from_pt);

  -- Full cedi: ownership moves to destination PT
  INSERT INTO public.pt_athlete_owners (atleta_user_id, owner_pt_user_id)
  VALUES (_atleta_user_id, _to_pt_user_id)
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

-- On recall, restore ownership to recalling PT
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
  v_current_pt UUID;
  v_last_to_pt UUID;
BEGIN
  IF v_recalling_pt IS NULL OR NOT public.is_pt(v_recalling_pt) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  IF _atleta_user_id IS NULL THEN
    RAISE EXCEPTION 'Atleta obbligatorio';
  END IF;

  SELECT pt_user_id INTO v_current_pt
  FROM public.pt_atleta_connections
  WHERE atleta_user_id = _atleta_user_id
    AND status = 'active'
  LIMIT 1;

  IF v_current_pt IS NULL THEN
    RAISE EXCEPTION 'L''atleta non ha un PT attivo';
  END IF;

  IF v_current_pt = v_recalling_pt THEN
    RAISE EXCEPTION 'L''atleta è già collegato a te';
  END IF;

  SELECT t.to_pt_user_id INTO v_last_to_pt
  FROM public.pt_atleta_transfers t
  WHERE t.atleta_user_id = _atleta_user_id
    AND t.from_pt_user_id = v_recalling_pt
    AND t.action = 'transfer_out'
    AND t.status = 'completed'
  ORDER BY t.completed_at DESC NULLS LAST, t.created_at DESC
  LIMIT 1;

  IF v_last_to_pt IS NULL OR v_last_to_pt <> v_current_pt THEN
    RAISE EXCEPTION 'Non puoi riprendere questo atleta: non risulta una cessione recente verso il PT attuale';
  END IF;

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
    v_current_pt,
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
