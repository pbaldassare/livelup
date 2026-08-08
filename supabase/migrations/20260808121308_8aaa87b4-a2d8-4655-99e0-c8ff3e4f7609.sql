CREATE TABLE IF NOT EXISTS public.pt_atleta_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_user_id UUID NOT NULL,
  from_pt_user_id UUID NOT NULL,
  to_pt_user_id UUID NOT NULL,
  action TEXT NOT NULL DEFAULT 'transfer_out'
    CHECK (action IN ('transfer_out', 'transfer_in', 'recall')),
  status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('pending', 'completed', 'cancelled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pt_atleta_transfers TO authenticated;
GRANT ALL ON public.pt_atleta_transfers TO service_role;

ALTER TABLE public.pt_atleta_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "PT can view own transfers" ON public.pt_atleta_transfers;
CREATE POLICY "PT can view own transfers"
ON public.pt_atleta_transfers FOR SELECT TO authenticated
USING (auth.uid() = from_pt_user_id OR auth.uid() = to_pt_user_id OR public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_pt_transfers_from ON public.pt_atleta_transfers (from_pt_user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_pt_transfers_to ON public.pt_atleta_transfers (to_pt_user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_pt_transfers_atleta ON public.pt_atleta_transfers (atleta_user_id);

CREATE OR REPLACE FUNCTION public.search_pts_for_transfer(_query TEXT DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  location_city TEXT,
  rating_avg NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pt_id UUID := auth.uid();
  v_q TEXT := NULLIF(TRIM(COALESCE(_query, '')), '');
BEGIN
  IF v_pt_id IS NULL OR NOT public.is_pt(v_pt_id) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  RETURN QUERY
  SELECT p.user_id, p.first_name, p.last_name, p.avatar_url,
         pp.location_city, pp.rating_avg
  FROM public.pt_profiles pp
  INNER JOIN public.profiles p ON p.user_id = pp.user_id
  WHERE pp.user_id <> v_pt_id
    AND COALESCE(pp.status::TEXT, 'active') = 'active'
    AND COALESCE(pp.is_active, true) = true
    AND (
      v_q IS NULL
      OR (COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '') || ' ' || COALESCE(p.email, '')) ILIKE '%' || v_q || '%'
    )
  ORDER BY p.first_name NULLS LAST, p.last_name NULLS LAST
  LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_pts_for_transfer(TEXT) TO authenticated;

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
  v_pt_id UUID := auth.uid();
  v_conn_id UUID;
  v_transfer_id UUID;
BEGIN
  IF v_pt_id IS NULL OR NOT public.is_pt(v_pt_id) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  IF _to_pt_user_id = v_pt_id THEN
    RAISE EXCEPTION 'Non puoi cedere un atleta a te stesso';
  END IF;

  IF NOT public.is_pt(_to_pt_user_id) THEN
    RAISE EXCEPTION 'Il destinatario non e un professionista valido';
  END IF;

  SELECT id INTO v_conn_id
  FROM public.pt_atleta_connections
  WHERE pt_user_id = v_pt_id
    AND atleta_user_id = _atleta_user_id
    AND status = 'active'
  LIMIT 1;

  IF v_conn_id IS NULL THEN
    RAISE EXCEPTION 'Atleta non collegato a questo professionista';
  END IF;

  PERFORM public._activate_pt_atleta_connection(_to_pt_user_id, _atleta_user_id, v_pt_id);

  UPDATE public.pt_atleta_connections
  SET status = 'terminated',
      terminated_at = now(),
      is_primary = false,
      updated_at = now()
  WHERE id = v_conn_id;

  INSERT INTO public.pt_atleta_transfers (
    atleta_user_id, from_pt_user_id, to_pt_user_id, action, status, completed_at, notes
  ) VALUES (
    _atleta_user_id, v_pt_id, _to_pt_user_id, 'transfer_out', 'completed', now(), _notes
  )
  RETURNING id INTO v_transfer_id;

  RETURN v_transfer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_athlete_to_pt(UUID, UUID, TEXT) TO authenticated;

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
  WITH latest_out AS (
    SELECT DISTINCT ON (t.atleta_user_id)
      t.atleta_user_id, t.to_pt_user_id, t.completed_at
    FROM public.pt_atleta_transfers t
    WHERE t.from_pt_user_id = v_pt_id
      AND t.action = 'transfer_out'
      AND t.status = 'completed'
    ORDER BY t.atleta_user_id, t.completed_at DESC NULLS LAST, t.created_at DESC
  ),
  later_recall AS (
    SELECT DISTINCT ON (t.atleta_user_id)
      t.atleta_user_id, t.completed_at
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
    c.pt_user_id,
    cp.first_name,
    cp.last_name,
    lo.completed_at
  FROM latest_out lo
  LEFT JOIN later_recall lr ON lr.atleta_user_id = lo.atleta_user_id
  INNER JOIN public.profiles ap ON ap.user_id = lo.atleta_user_id
  INNER JOIN public.pt_atleta_connections c
    ON c.atleta_user_id = lo.atleta_user_id
    AND c.pt_user_id = lo.to_pt_user_id
    AND c.status = 'active'
  LEFT JOIN public.profiles cp ON cp.user_id = c.pt_user_id
  WHERE (lr.completed_at IS NULL OR lr.completed_at < lo.completed_at)
  ORDER BY lo.completed_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_recallable_athletes_for_pt() TO authenticated;

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
  v_pt_id UUID := auth.uid();
  v_last_out RECORD;
  v_last_recall TIMESTAMPTZ;
  v_conn_id UUID;
  v_transfer_id UUID;
BEGIN
  IF v_pt_id IS NULL OR NOT public.is_pt(v_pt_id) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  SELECT t.to_pt_user_id, t.completed_at
  INTO v_last_out
  FROM public.pt_atleta_transfers t
  WHERE t.from_pt_user_id = v_pt_id
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
  WHERE t.to_pt_user_id = v_pt_id
    AND t.atleta_user_id = _atleta_user_id
    AND t.action = 'recall'
    AND t.status = 'completed'
  ORDER BY t.completed_at DESC NULLS LAST, t.created_at DESC
  LIMIT 1;

  IF v_last_recall IS NOT NULL AND v_last_recall >= v_last_out.completed_at THEN
    RAISE EXCEPTION 'Atleta gia ripreso';
  END IF;

  SELECT id INTO v_conn_id
  FROM public.pt_atleta_connections
  WHERE pt_user_id = v_last_out.to_pt_user_id
    AND atleta_user_id = _atleta_user_id
    AND status = 'active'
  LIMIT 1;

  IF v_conn_id IS NULL THEN
    RAISE EXCEPTION 'Atleta non piu collegato al professionista destinatario';
  END IF;

  PERFORM public._activate_pt_atleta_connection(v_pt_id, _atleta_user_id, v_pt_id);

  UPDATE public.pt_atleta_connections
  SET status = 'terminated',
      terminated_at = now(),
      is_primary = false,
      updated_at = now()
  WHERE id = v_conn_id;

  INSERT INTO public.pt_atleta_transfers (
    atleta_user_id, from_pt_user_id, to_pt_user_id, action, status, completed_at, notes
  ) VALUES (
    _atleta_user_id, v_last_out.to_pt_user_id, v_pt_id, 'recall', 'completed', now(), _notes
  )
  RETURNING id INTO v_transfer_id;

  RETURN v_transfer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recall_athlete_from_transfer(UUID, TEXT) TO authenticated;