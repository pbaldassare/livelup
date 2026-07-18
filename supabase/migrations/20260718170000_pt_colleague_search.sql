-- =====================================================
-- Ricerca colleghi PT dalla PWA ("Cerca PT e professionisti")
-- pt_profiles non ha una policy che permetta a un PT di leggere
-- il profilo di un altro PT (solo "own profile" + admin + atleta
-- connesso/discoverable). Serve una RPC SECURITY DEFINER dedicata,
-- sul modello di search_pts_for_transfer, ma con i campi necessari
-- alla scheda (bio, specializzazioni, modalità, rating).
-- =====================================================

CREATE OR REPLACE FUNCTION public.search_pt_colleagues(_query TEXT DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  specializations TEXT[],
  location_city TEXT,
  experience_years INTEGER,
  offers_online BOOLEAN,
  offers_in_person BOOLEAN,
  rating_avg NUMERIC,
  review_count INTEGER
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
    p.first_name,
    p.last_name,
    p.avatar_url,
    pp.bio,
    pp.specializations,
    pp.location_city,
    pp.experience_years,
    pp.offers_online,
    pp.offers_in_person,
    pp.rating_avg,
    pp.review_count
  FROM public.pt_profiles pp
  INNER JOIN public.profiles p ON p.user_id = pp.user_id
  INNER JOIN public.user_roles ur ON ur.user_id = pp.user_id AND ur.role = 'pt'
  WHERE pp.user_id <> v_pt_id
    AND pp.status = 'attivo'
    AND (
      v_q IS NULL
      OR p.first_name ILIKE '%' || v_q || '%'
      OR p.last_name ILIKE '%' || v_q || '%'
      OR pp.location_city ILIKE '%' || v_q || '%'
      OR EXISTS (
        SELECT 1 FROM unnest(pp.specializations) AS s WHERE s ILIKE '%' || v_q || '%'
      )
    )
  ORDER BY pp.rating_avg DESC NULLS LAST, p.last_name, p.first_name
  LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_pt_colleagues(TEXT) TO authenticated;
