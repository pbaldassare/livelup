CREATE TABLE IF NOT EXISTS public.pt_athlete_owners (
  atleta_user_id UUID PRIMARY KEY,
  owner_pt_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pt_athlete_owners TO authenticated;
GRANT ALL ON public.pt_athlete_owners TO service_role;
ALTER TABLE public.pt_athlete_owners ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.pt_athlete_collaborator_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_user_id UUID NOT NULL,
  collaborator_pt_user_id UUID NOT NULL,
  owner_pt_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pt_athlete_collab_status_check CHECK (status IN ('active', 'revoked'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pt_athlete_collab_active
  ON public.pt_athlete_collaborator_assignments (atleta_user_id, collaborator_pt_user_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_pt_athlete_collab_collaborator
  ON public.pt_athlete_collaborator_assignments (collaborator_pt_user_id, status);

GRANT SELECT ON public.pt_athlete_collaborator_assignments TO authenticated;
GRANT ALL ON public.pt_athlete_collaborator_assignments TO service_role;
ALTER TABLE public.pt_athlete_collaborator_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners_select_involved" ON public.pt_athlete_owners;
CREATE POLICY "owners_select_involved" ON public.pt_athlete_owners
  FOR SELECT TO authenticated
  USING (
    owner_pt_user_id = auth.uid()
    OR atleta_user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.pt_athlete_collaborator_assignments a
      WHERE a.atleta_user_id = pt_athlete_owners.atleta_user_id
        AND a.collaborator_pt_user_id = auth.uid()
        AND a.status = 'active'
    )
  );

DROP POLICY IF EXISTS "collab_select_involved" ON public.pt_athlete_collaborator_assignments;
CREATE POLICY "collab_select_involved" ON public.pt_athlete_collaborator_assignments
  FOR SELECT TO authenticated
  USING (
    owner_pt_user_id = auth.uid()
    OR collaborator_pt_user_id = auth.uid()
    OR atleta_user_id = auth.uid()
    OR public.is_admin(auth.uid())
  );

DROP TRIGGER IF EXISTS trg_pt_athlete_owners_updated ON public.pt_athlete_owners;
CREATE TRIGGER trg_pt_athlete_owners_updated
  BEFORE UPDATE ON public.pt_athlete_owners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_pt_athlete_collab_updated ON public.pt_athlete_collaborator_assignments;
CREATE TRIGGER trg_pt_athlete_collab_updated
  BEFORE UPDATE ON public.pt_athlete_collaborator_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.pt_athlete_owners (atleta_user_id, owner_pt_user_id)
SELECT DISTINCT ON (c.atleta_user_id) c.atleta_user_id, c.pt_user_id
FROM public.pt_atleta_connections c
WHERE c.status = 'active'
ORDER BY c.atleta_user_id, c.is_primary DESC NULLS LAST, c.accepted_at ASC NULLS LAST, c.created_at ASC
ON CONFLICT (atleta_user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_athlete_owner_pt(_atleta_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT owner_pt_user_id FROM public.pt_athlete_owners WHERE atleta_user_id = _atleta_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_athlete_owner_pt(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.assign_athlete_to_collaborator(
  _atleta_user_id UUID,
  _collaborator_pt_user_id UUID,
  _notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pt_id UUID := auth.uid();
  v_owner UUID;
  v_id UUID;
BEGIN
  IF v_pt_id IS NULL OR NOT public.is_pt(v_pt_id) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  v_owner := public.get_athlete_owner_pt(_atleta_user_id);
  IF v_owner IS NULL OR v_owner <> v_pt_id THEN
    RAISE EXCEPTION 'Solo il professionista titolare puo assegnare questo atleta';
  END IF;

  IF _collaborator_pt_user_id = v_pt_id THEN
    RAISE EXCEPTION 'Non puoi assegnare l atleta a te stesso';
  END IF;

  IF NOT public.is_pt(_collaborator_pt_user_id) THEN
    RAISE EXCEPTION 'Il collaboratore non e un professionista valido';
  END IF;

  SELECT id INTO v_id
  FROM public.pt_athlete_collaborator_assignments
  WHERE atleta_user_id = _atleta_user_id
    AND collaborator_pt_user_id = _collaborator_pt_user_id
    AND status = 'active';

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.pt_athlete_collaborator_assignments (
    atleta_user_id, collaborator_pt_user_id, owner_pt_user_id, status, notes
  ) VALUES (
    _atleta_user_id, _collaborator_pt_user_id, v_pt_id, 'active', _notes
  )
  RETURNING id INTO v_id;

  PERFORM public._activate_pt_atleta_connection(_collaborator_pt_user_id, _atleta_user_id, v_pt_id);

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_athlete_to_collaborator(UUID, UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_collaborator_assignment(
  _atleta_user_id UUID,
  _collaborator_pt_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pt_id UUID := auth.uid();
  v_owner UUID;
BEGIN
  IF v_pt_id IS NULL OR NOT public.is_pt(v_pt_id) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  v_owner := public.get_athlete_owner_pt(_atleta_user_id);
  IF v_owner IS NULL OR v_owner <> v_pt_id THEN
    RAISE EXCEPTION 'Solo il professionista titolare puo revocare questa assegnazione';
  END IF;

  UPDATE public.pt_athlete_collaborator_assignments
  SET status = 'revoked', revoked_at = now(), updated_at = now()
  WHERE atleta_user_id = _atleta_user_id
    AND collaborator_pt_user_id = _collaborator_pt_user_id
    AND status = 'active';

  UPDATE public.pt_atleta_connections
  SET status = 'terminated', terminated_at = now(), is_primary = false, updated_at = now()
  WHERE atleta_user_id = _atleta_user_id
    AND pt_user_id = _collaborator_pt_user_id
    AND status = 'active';

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_collaborator_assignment(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.move_athlete_to_collaborator(
  _atleta_user_id UUID,
  _collaborator_pt_user_id UUID,
  _notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pt_id UUID := auth.uid();
  v_owner UUID;
  v_other RECORD;
  v_id UUID;
BEGIN
  IF v_pt_id IS NULL OR NOT public.is_pt(v_pt_id) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  v_owner := public.get_athlete_owner_pt(_atleta_user_id);
  IF v_owner IS NULL OR v_owner <> v_pt_id THEN
    RAISE EXCEPTION 'Solo il professionista titolare puo spostare questo atleta';
  END IF;

  FOR v_other IN
    SELECT collaborator_pt_user_id
    FROM public.pt_athlete_collaborator_assignments
    WHERE atleta_user_id = _atleta_user_id
      AND status = 'active'
      AND collaborator_pt_user_id <> _collaborator_pt_user_id
  LOOP
    PERFORM public.revoke_collaborator_assignment(_atleta_user_id, v_other.collaborator_pt_user_id);
  END LOOP;

  v_id := public.assign_athlete_to_collaborator(_atleta_user_id, _collaborator_pt_user_id, _notes);
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.move_athlete_to_collaborator(UUID, UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_my_collaborator_roster()
RETURNS TABLE (
  assignment_id UUID,
  atleta_user_id UUID,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  email TEXT,
  owner_pt_user_id UUID,
  owner_first_name TEXT,
  owner_last_name TEXT,
  assigned_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pt_id UUID := auth.uid();
BEGIN
  IF v_pt_id IS NULL OR NOT public.is_pt(v_pt_id) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.atleta_user_id,
    p.first_name,
    p.last_name,
    p.avatar_url,
    p.email,
    a.owner_pt_user_id,
    op.first_name,
    op.last_name,
    a.assigned_at
  FROM public.pt_athlete_collaborator_assignments a
  INNER JOIN public.profiles p ON p.user_id = a.atleta_user_id
  LEFT JOIN public.profiles op ON op.user_id = a.owner_pt_user_id
  WHERE a.collaborator_pt_user_id = v_pt_id
    AND a.status = 'active'
  ORDER BY a.assigned_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_my_collaborator_roster() TO authenticated;

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
  v_owner UUID;
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

  v_owner := public.get_athlete_owner_pt(_atleta_user_id);
  IF v_owner IS NOT NULL AND v_owner <> v_pt_id THEN
    RAISE EXCEPTION 'Solo il professionista titolare puo cedere questo atleta';
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

  UPDATE public.pt_athlete_collaborator_assignments
  SET status = 'revoked', revoked_at = now(), updated_at = now()
  WHERE atleta_user_id = _atleta_user_id AND status = 'active';

  INSERT INTO public.pt_athlete_owners (atleta_user_id, owner_pt_user_id)
  VALUES (_atleta_user_id, _to_pt_user_id)
  ON CONFLICT (atleta_user_id)
  DO UPDATE SET owner_pt_user_id = EXCLUDED.owner_pt_user_id, updated_at = now();

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

  UPDATE public.pt_athlete_collaborator_assignments
  SET status = 'revoked', revoked_at = now(), updated_at = now()
  WHERE atleta_user_id = _atleta_user_id AND status = 'active';

  INSERT INTO public.pt_athlete_owners (atleta_user_id, owner_pt_user_id)
  VALUES (_atleta_user_id, v_pt_id)
  ON CONFLICT (atleta_user_id)
  DO UPDATE SET owner_pt_user_id = EXCLUDED.owner_pt_user_id, updated_at = now();

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