CREATE OR REPLACE FUNCTION public.find_atleta_by_email_for_pt(_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pt_id UUID := auth.uid();
  v_user_id UUID;
  v_first_name TEXT;
  v_last_name TEXT;
  v_has_active_pt BOOLEAN;
  v_conn_status TEXT;
BEGIN
  IF v_pt_id IS NULL OR NOT public.is_pt(v_pt_id) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  IF _email IS NULL OR trim(_email) = '' THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT p.user_id, p.first_name, p.last_name
  INTO v_user_id, v_first_name, v_last_name
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'atleta'
  WHERE lower(trim(p.email)) = lower(trim(_email))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.pt_atleta_connections
    WHERE atleta_user_id = v_user_id AND status = 'active'
  ) INTO v_has_active_pt;

  SELECT status INTO v_conn_status
  FROM public.pt_atleta_connections
  WHERE atleta_user_id = v_user_id AND pt_user_id = v_pt_id
  LIMIT 1;

  RETURN jsonb_build_object(
    'found', true,
    'user_id', v_user_id,
    'first_name', v_first_name,
    'last_name', v_last_name,
    'has_active_pt', v_has_active_pt,
    'connection_with_me', v_conn_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_atleta_by_email_for_pt(TEXT) TO authenticated;

DROP POLICY IF EXISTS "Atleta can update own connections" ON public.pt_atleta_connections;
CREATE POLICY "Atleta can update own connections"
  ON public.pt_atleta_connections FOR UPDATE TO authenticated
  USING (auth.uid() = atleta_user_id AND public.is_atleta(auth.uid()))
  WITH CHECK (auth.uid() = atleta_user_id AND public.is_atleta(auth.uid()));