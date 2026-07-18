-- Training modality on PT–athlete connections (in_presenza / online / mix)
-- + RPC to list ceded athletes for post-transfer visibility
-- + copy modality when transferring to another PT

ALTER TABLE public.pt_atleta_connections
  ADD COLUMN IF NOT EXISTS training_modality TEXT
  DEFAULT 'mix';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pt_atleta_connections_training_modality_check'
  ) THEN
    ALTER TABLE public.pt_atleta_connections
      ADD CONSTRAINT pt_atleta_connections_training_modality_check
      CHECK (
        training_modality IS NULL
        OR training_modality IN ('in_presenza', 'online', 'mix')
      );
  END IF;
END $$;

COMMENT ON COLUMN public.pt_atleta_connections.training_modality IS
  'PT-managed training modality for the athlete: in_presenza, online, or mix.';

CREATE INDEX IF NOT EXISTS idx_pt_atleta_connections_training_modality
  ON public.pt_atleta_connections (pt_user_id, training_modality)
  WHERE status = 'active';

-- Copy modality from previous active connection when activating a new one
CREATE OR REPLACE FUNCTION public._activate_pt_atleta_connection(
  _pt_user_id UUID,
  _atleta_user_id UUID,
  _requested_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conn_id UUID;
  v_modality TEXT;
BEGIN
  SELECT training_modality INTO v_modality
  FROM public.pt_atleta_connections
  WHERE atleta_user_id = _atleta_user_id
    AND status = 'active'
  ORDER BY accepted_at DESC NULLS LAST
  LIMIT 1;

  SELECT id INTO v_conn_id
  FROM public.pt_atleta_connections
  WHERE pt_user_id = _pt_user_id
    AND atleta_user_id = _atleta_user_id;

  IF v_conn_id IS NOT NULL THEN
    UPDATE public.pt_atleta_connections
    SET
      status = 'active',
      accepted_at = COALESCE(accepted_at, now()),
      terminated_at = NULL,
      is_pt_active = true,
      training_modality = COALESCE(training_modality, v_modality, 'mix'),
      updated_at = now()
    WHERE id = v_conn_id;
    RETURN v_conn_id;
  END IF;

  INSERT INTO public.pt_atleta_connections (
    pt_user_id,
    atleta_user_id,
    status,
    requested_by,
    accepted_at,
    training_modality
  ) VALUES (
    _pt_user_id,
    _atleta_user_id,
    'active',
    _requested_by,
    now(),
    COALESCE(v_modality, 'mix')
  )
  RETURNING id INTO v_conn_id;

  RETURN v_conn_id;
END;
$$;

REVOKE ALL ON FUNCTION public._activate_pt_atleta_connection(UUID, UUID, UUID) FROM PUBLIC;

-- Ceduti: athletes this PT transferred out (latest transfer_out per athlete)
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
    COALESCE(c.training_modality, prev.training_modality, 'mix') AS training_modality,
    atl.fitness_level,
    c.pt_user_id AS current_pt_user_id,
    cp.first_name AS current_pt_first_name,
    cp.last_name AS current_pt_last_name,
    lo.completed_at AS transferred_at,
    (
      c.pt_user_id IS NOT NULL
      AND c.pt_user_id = lo.to_pt_user_id
      AND c.status = 'active'
      AND (lr.completed_at IS NULL OR lr.completed_at < lo.completed_at)
    ) AS is_recallable
  FROM latest_out lo
  LEFT JOIN later_recall lr ON lr.atleta_user_id = lo.atleta_user_id
  INNER JOIN public.profiles ap ON ap.user_id = lo.atleta_user_id
  LEFT JOIN public.atleta_profiles atl ON atl.user_id = lo.atleta_user_id
  LEFT JOIN public.pt_atleta_connections c
    ON c.atleta_user_id = lo.atleta_user_id
    AND c.status = 'active'
  LEFT JOIN public.profiles cp ON cp.user_id = c.pt_user_id
  LEFT JOIN LATERAL (
    SELECT pc.training_modality
    FROM public.pt_atleta_connections pc
    WHERE pc.atleta_user_id = lo.atleta_user_id
      AND pc.pt_user_id = v_pt_id
    ORDER BY pc.updated_at DESC NULLS LAST
    LIMIT 1
  ) prev ON true
  WHERE lr.completed_at IS NULL OR lr.completed_at < lo.completed_at
  ORDER BY lo.completed_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ceded_athletes_for_pt() TO authenticated;

-- Bulk transfer: same target PT for many athletes
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
