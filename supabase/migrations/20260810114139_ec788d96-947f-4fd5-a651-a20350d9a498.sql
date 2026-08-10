CREATE OR REPLACE FUNCTION public.transfer_athlete_to_pt(
  _atleta_user_id uuid,
  _to_pt_user_id uuid,
  _notes text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  INSERT INTO public.pt_athlete_owners (atleta_user_id, owner_pt_user_id)
  VALUES (_atleta_user_id, v_pt_id)
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
$function$;

CREATE OR REPLACE FUNCTION public.recall_athlete_from_transfer(
  _atleta_user_id uuid,
  _notes text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pt_id UUID := auth.uid();
  v_last_out RECORD;
  v_last_recall TIMESTAMPTZ;
  v_conn_id UUID;
  v_transfer_id UUID;
  v_owner UUID;
BEGIN
  IF v_pt_id IS NULL OR NOT public.is_pt(v_pt_id) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  v_owner := public.get_athlete_owner_pt(_atleta_user_id);
  IF v_owner IS NOT NULL AND v_owner <> v_pt_id THEN
    RAISE EXCEPTION 'Solo il professionista titolare puo riprendere questo atleta';
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
  WHERE atleta_user_id = _atleta_user_id
    AND collaborator_pt_user_id = v_last_out.to_pt_user_id
    AND status = 'active';

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
$function$;

GRANT EXECUTE ON FUNCTION public.transfer_athlete_to_pt(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recall_athlete_from_transfer(uuid, text) TO authenticated;

DROP POLICY IF EXISTS "PT can view and manage subscriptions" ON public.atleta_pt_subscriptions;

CREATE POLICY "PT connected can view subscriptions"
ON public.atleta_pt_subscriptions
FOR SELECT
TO authenticated
USING (
  is_pt(auth.uid())
  AND (auth.uid() = pt_user_id OR public.are_connected(auth.uid(), atleta_user_id))
);

CREATE POLICY "Owner PT can insert subscriptions"
ON public.atleta_pt_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  is_pt(auth.uid())
  AND auth.uid() = pt_user_id
  AND COALESCE(public.get_athlete_owner_pt(atleta_user_id), auth.uid()) = auth.uid()
);

CREATE POLICY "Owner PT can update subscriptions"
ON public.atleta_pt_subscriptions
FOR UPDATE
TO authenticated
USING (
  is_pt(auth.uid())
  AND COALESCE(public.get_athlete_owner_pt(atleta_user_id), pt_user_id) = auth.uid()
)
WITH CHECK (
  is_pt(auth.uid())
  AND COALESCE(public.get_athlete_owner_pt(atleta_user_id), pt_user_id) = auth.uid()
);

CREATE POLICY "Owner PT can delete subscriptions"
ON public.atleta_pt_subscriptions
FOR DELETE
TO authenticated
USING (
  is_pt(auth.uid())
  AND COALESCE(public.get_athlete_owner_pt(atleta_user_id), pt_user_id) = auth.uid()
);

WITH latest_out AS (
  SELECT DISTINCT ON (t.atleta_user_id)
    t.atleta_user_id, t.from_pt_user_id, t.completed_at
  FROM public.pt_atleta_transfers t
  WHERE t.action = 'transfer_out' AND t.status = 'completed'
  ORDER BY t.atleta_user_id, t.completed_at DESC NULLS LAST, t.created_at DESC
),
latest_recall AS (
  SELECT DISTINCT ON (t.atleta_user_id)
    t.atleta_user_id, t.completed_at
  FROM public.pt_atleta_transfers t
  WHERE t.action = 'recall' AND t.status = 'completed'
  ORDER BY t.atleta_user_id, t.completed_at DESC NULLS LAST, t.created_at DESC
),
to_restore AS (
  SELECT lo.atleta_user_id, lo.from_pt_user_id
  FROM latest_out lo
  LEFT JOIN latest_recall lr ON lr.atleta_user_id = lo.atleta_user_id
  WHERE lr.completed_at IS NULL OR lr.completed_at < lo.completed_at
)
INSERT INTO public.pt_athlete_owners (atleta_user_id, owner_pt_user_id)
SELECT atleta_user_id, from_pt_user_id FROM to_restore
ON CONFLICT (atleta_user_id)
DO UPDATE SET owner_pt_user_id = EXCLUDED.owner_pt_user_id, updated_at = now();

WITH latest_out AS (
  SELECT DISTINCT ON (t.atleta_user_id)
    t.atleta_user_id, t.from_pt_user_id, t.to_pt_user_id, t.completed_at
  FROM public.pt_atleta_transfers t
  WHERE t.action = 'transfer_out' AND t.status = 'completed'
  ORDER BY t.atleta_user_id, t.completed_at DESC NULLS LAST, t.created_at DESC
),
latest_recall AS (
  SELECT DISTINCT ON (t.atleta_user_id)
    t.atleta_user_id, t.completed_at
  FROM public.pt_atleta_transfers t
  WHERE t.action = 'recall' AND t.status = 'completed'
  ORDER BY t.atleta_user_id, t.completed_at DESC NULLS LAST, t.created_at DESC
)
UPDATE public.pt_atleta_connections c
SET status = 'active', terminated_at = NULL, updated_at = now()
FROM latest_out lo
LEFT JOIN latest_recall lr ON lr.atleta_user_id = lo.atleta_user_id
WHERE c.atleta_user_id = lo.atleta_user_id
  AND c.pt_user_id = lo.from_pt_user_id
  AND c.status = 'terminated'
  AND (lr.completed_at IS NULL OR lr.completed_at < lo.completed_at);