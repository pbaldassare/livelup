-- Ricerca atleti per invito PT: RETURNS TABLE (PostgREST restituisce un array)
-- e match anche su auth.users.email se profiles.email è vuoto.

DROP FUNCTION IF EXISTS public.search_atleti_for_pt(TEXT);

CREATE FUNCTION public.search_atleti_for_pt(_query TEXT)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  has_active_pt BOOLEAN,
  has_other_pts BOOLEAN,
  connection_with_me TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pt_id UUID := auth.uid();
  v_raw TEXT := trim(coalesce(_query, ''));
  v_q TEXT;
BEGIN
  IF v_pt_id IS NULL OR NOT public.is_pt(v_pt_id) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  IF char_length(v_raw) < 3 THEN
    RETURN;
  END IF;

  v_q := replace(replace(replace(v_raw, '\', '\\'), '%', '\%'), '_', '\_');

  RETURN QUERY
  SELECT
    p.user_id,
    coalesce(nullif(trim(p.email), ''), au.email)::text AS email,
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
    ) AS connection_with_me
  FROM public.profiles p
  INNER JOIN public.user_roles ur
    ON ur.user_id = p.user_id AND ur.role = 'atleta'
  LEFT JOIN auth.users au
    ON au.id = p.user_id
  WHERE
    coalesce(p.email, '') ILIKE '%' || v_q || '%' ESCAPE '\'
    OR coalesce(au.email, '') ILIKE '%' || v_q || '%' ESCAPE '\'
    OR coalesce(p.first_name, '') ILIKE '%' || v_q || '%' ESCAPE '\'
    OR coalesce(p.last_name, '') ILIKE '%' || v_q || '%' ESCAPE '\'
    OR (coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) ILIKE '%' || v_q || '%' ESCAPE '\'
  ORDER BY
    CASE
      WHEN lower(coalesce(p.email, au.email, '')) = lower(v_raw) THEN 0
      WHEN lower(coalesce(p.email, au.email, '')) LIKE lower(v_raw) || '%' THEN 1
      ELSE 2
    END,
    p.last_name NULLS LAST,
    p.first_name NULLS LAST
  LIMIT 10;
END;
$$;

COMMENT ON FUNCTION public.search_atleti_for_pt(TEXT) IS
  'PT: cerca atleti registrati per email/nome (min 3 caratteri, max 10). Include auth.users.email.';

GRANT EXECUTE ON FUNCTION public.search_atleti_for_pt(TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.search_atleti_for_pt(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_atleti_for_pt(TEXT) FROM anon;
