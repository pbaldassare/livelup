-- Restore search_pts_for_transfer (used by PT App "Assegna atleta" → PT destinatario).
-- The RPC was defined in 20260714190000 but is missing from the live schema /
-- PostgREST types (PGRST202), so the destinatario list stayed empty/skeleton.
-- Include premium (active paid PT) alongside attivo; cast text columns for
-- RETURN QUERY type safety.

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
  v_q TEXT := NULLIF(trim(_query), '');
BEGIN
  IF v_pt_id IS NULL OR NOT public.is_pt(v_pt_id) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  RETURN QUERY
  SELECT
    pp.user_id,
    p.first_name::text,
    p.last_name::text,
    p.avatar_url::text,
    pp.location_city::text,
    pp.rating_avg::numeric
  FROM public.pt_profiles pp
  INNER JOIN public.profiles p ON p.user_id = pp.user_id
  INNER JOIN public.user_roles ur ON ur.user_id = pp.user_id AND ur.role = 'pt'
  WHERE pp.user_id <> v_pt_id
    AND pp.status IN ('attivo', 'premium')
    AND (
      v_q IS NULL
      OR p.first_name ILIKE '%' || v_q || '%'
      OR p.last_name ILIKE '%' || v_q || '%'
      OR (COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) ILIKE '%' || v_q || '%'
      OR pp.location_city ILIKE '%' || v_q || '%'
    )
  ORDER BY pp.rating_avg DESC NULLS LAST, p.last_name, p.first_name
  LIMIT 30;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_pts_for_transfer(TEXT) TO authenticated;
