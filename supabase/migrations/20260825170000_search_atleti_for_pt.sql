-- Ricerca atleti registrati per invito PT (email/nome parziale).
-- SECURITY DEFINER: i PT non hanno SELECT libero su tutti i profiles.

CREATE OR REPLACE FUNCTION public.search_atleti_for_pt(_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pt_id UUID := auth.uid();
  v_raw TEXT := trim(coalesce(_query, ''));
  v_q TEXT;
  v_result JSONB;
BEGIN
  IF v_pt_id IS NULL OR NOT public.is_pt(v_pt_id) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  IF char_length(v_raw) < 3 THEN
    RETURN '[]'::jsonb;
  END IF;

  v_q := replace(replace(replace(v_raw, '\', '\\'), '%', '\%'), '_', '\_');

  SELECT coalesce(
    jsonb_agg(to_jsonb(t) - '_rank' ORDER BY t._rank, t.last_name NULLS LAST, t.first_name NULLS LAST),
    '[]'::jsonb
  )
  INTO v_result
  FROM (
    SELECT
      p.user_id,
      p.email,
      p.first_name,
      p.last_name,
      EXISTS (
        SELECT 1
        FROM public.pt_atleta_connections c_any
        WHERE c_any.atleta_user_id = p.user_id
          AND c_any.status = 'active'
      ) AS has_active_pt,
      EXISTS (
        SELECT 1
        FROM public.pt_atleta_connections c_oth
        WHERE c_oth.atleta_user_id = p.user_id
          AND c_oth.status = 'active'
          AND c_oth.pt_user_id <> v_pt_id
      ) AS has_other_pts,
      (
        SELECT c_me.status
        FROM public.pt_atleta_connections c_me
        WHERE c_me.atleta_user_id = p.user_id
          AND c_me.pt_user_id = v_pt_id
        ORDER BY
          CASE c_me.status
            WHEN 'active' THEN 0
            WHEN 'pending' THEN 1
            ELSE 2
          END,
          c_me.created_at DESC
        LIMIT 1
      ) AS connection_with_me,
      CASE
        WHEN lower(coalesce(p.email, '')) = lower(v_raw) THEN 0
        WHEN lower(coalesce(p.email, '')) LIKE lower(v_raw) || '%' THEN 1
        ELSE 2
      END AS _rank
    FROM public.profiles p
    INNER JOIN public.user_roles ur
      ON ur.user_id = p.user_id AND ur.role = 'atleta'
    WHERE
      p.email ILIKE '%' || v_q || '%' ESCAPE '\'
      OR coalesce(p.first_name, '') ILIKE '%' || v_q || '%' ESCAPE '\'
      OR coalesce(p.last_name, '') ILIKE '%' || v_q || '%' ESCAPE '\'
      OR (coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) ILIKE '%' || v_q || '%' ESCAPE '\'
    ORDER BY
      _rank,
      p.last_name NULLS LAST,
      p.first_name NULLS LAST
    LIMIT 10
  ) t;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.search_atleti_for_pt(TEXT) IS
  'PT: cerca atleti registrati per email/nome (min 3 caratteri, max 10). Multi-PT: invitabili anche con altri coach.';

GRANT EXECUTE ON FUNCTION public.search_atleti_for_pt(TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.search_atleti_for_pt(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_atleti_for_pt(TEXT) FROM anon;

-- Allinea il lookup esatto: stato connessione con questo PT (active/pending prima di terminated)
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
  v_has_other_pts BOOLEAN;
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

  SELECT EXISTS (
    SELECT 1 FROM public.pt_atleta_connections
    WHERE atleta_user_id = v_user_id AND status = 'active' AND pt_user_id <> v_pt_id
  ) INTO v_has_other_pts;

  SELECT status INTO v_conn_status
  FROM public.pt_atleta_connections
  WHERE atleta_user_id = v_user_id AND pt_user_id = v_pt_id
  ORDER BY
    CASE status WHEN 'active' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
    created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'found', true,
    'user_id', v_user_id,
    'first_name', v_first_name,
    'last_name', v_last_name,
    'has_active_pt', v_has_active_pt,
    'has_other_pts', v_has_other_pts,
    'connection_with_me', v_conn_status
  );
END;
$$;
