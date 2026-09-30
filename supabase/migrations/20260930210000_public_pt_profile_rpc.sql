-- Profilo pubblico PT (/pts/:userId) leggibile da tutti (anon, PT, atleti).
-- Le policy su pt_profiles/profiles espongono il PT solo ad atleti/admin/se stesso:
-- questa funzione restituisce solo i campi pubblici di un PT discoverable e attivo.

CREATE OR REPLACE FUNCTION public.get_public_pt_profile(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'pt', jsonb_build_object(
      'id', pp.id,
      'user_id', pp.user_id,
      'status', pp.status,
      'bio', pp.bio,
      'specializations', pp.specializations,
      'certifications', pp.certifications,
      'experience_years', pp.experience_years,
      'hourly_rate', pp.hourly_rate,
      'currency', pp.currency,
      'location_city', pp.location_city,
      'location_country', pp.location_country,
      'offers_online', pp.offers_online,
      'offers_in_person', pp.offers_in_person,
      'online_only', pp.online_only,
      'is_discoverable', pp.is_discoverable,
      'level', pp.level,
      'method_description', pp.method_description,
      'price_min', pp.price_min,
      'price_max', pp.price_max,
      'rating_avg', pp.rating_avg,
      'review_count', pp.review_count,
      'gallery_photos', pp.gallery_photos,
      'pt_type_id', pp.pt_type_id,
      'availability_bookable', pp.availability_bookable,
      'service_modality', pp.service_modality
    ),
    'profile', jsonb_build_object(
      'first_name', p.first_name,
      'last_name', p.last_name,
      'avatar_url', p.avatar_url
    )
  )
  FROM public.pt_profiles pp
  JOIN public.profiles p ON p.user_id = pp.user_id
  WHERE pp.user_id = _user_id
    AND pp.is_discoverable = true
    AND pp.status IN ('attivo', 'premium');
$$;

REVOKE ALL ON FUNCTION public.get_public_pt_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_pt_profile(uuid) TO anon, authenticated;
