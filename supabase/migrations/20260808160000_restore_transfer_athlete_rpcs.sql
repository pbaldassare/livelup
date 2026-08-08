-- Restore transfer / recall RPCs used by PT App "Cedi atleta" / "Riprendi" / "Ceduti".
-- Originally defined in 20260714190000_pt_athlete_transfers.sql but missing from the
-- live schema / PostgREST types (PGRST202: transfer_athlete_to_pt(uuid,uuid,text)).
-- Bulk transfer_athletes_to_pt (present) depends on the single-athlete RPC.
-- Table pt_atleta_transfers + helper _activate_pt_atleta_connection + get_ceded
-- are assumed present (already in types); recreate table/policies defensively.

CREATE TABLE IF NOT EXISTS public.pt_atleta_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_pt_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_pt_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('transfer_out', 'transfer_in', 'recall')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pt_atleta_transfers_atleta
  ON public.pt_atleta_transfers (atleta_user_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_pt_atleta_transfers_from_pt
  ON public.pt_atleta_transfers (from_pt_user_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_pt_atleta_transfers_to_pt
  ON public.pt_atleta_transfers (to_pt_user_id, completed_at DESC);

ALTER TABLE public.pt_atleta_transfers ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.pt_atleta_transfers TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pt_atleta_transfers'
      AND policyname = 'PTs involved can view transfers'
  ) THEN
    CREATE POLICY "PTs involved can view transfers"
      ON public.pt_atleta_transfers FOR SELECT TO authenticated
      USING (
        public.is_pt(auth.uid())
        AND (from_pt_user_id = auth.uid() OR to_pt_user_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pt_atleta_transfers'
      AND policyname = 'Admins can view all transfers'
  ) THEN
    CREATE POLICY "Admins can view all transfers"
      ON public.pt_atleta_transfers FOR SELECT TO authenticated
      USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- =====================================================
-- Transfer athlete from current PT to target PT
-- Frontend: transferAthleteToPt → rpc('transfer_athlete_to_pt', {
--   _atleta_user_id, _to_pt_user_id, _notes })
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

  IF NOT public.can_pt_accept_athletes(_to_pt_user_id) THEN
    RAISE EXCEPTION 'Il PT destinatario ha raggiunto il numero massimo di atleti';
  END IF;

  PERFORM public._activate_pt_atleta_connection(_to_pt_user_id, _atleta_user_id, v_from_pt);

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
-- Recall athlete from PT they were transferred to
-- Frontend: recallAthleteFromTransfer → rpc('recall_athlete_from_transfer', {
--   _atleta_user_id, _notes })
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

-- =====================================================
-- List athletes the PT can recall (Riprendi tab fallback)
-- Frontend: getRecallableAthletes → rpc('get_recallable_athletes_for_pt')
-- =====================================================

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
  INNER JOIN public.pt_atleta_connections c
    ON c.atleta_user_id = lt.atleta_user_id
    AND c.status = 'active'
    AND c.pt_user_id = lt.to_pt_user_id
  INNER JOIN public.profiles ap ON ap.user_id = lt.atleta_user_id
  INNER JOIN public.profiles cp ON cp.user_id = c.pt_user_id
  ORDER BY lt.completed_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_recallable_athletes_for_pt() TO authenticated;

-- Re-assert bulk wrapper (already in types; depends on single-athlete RPC above)
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
