-- Demo PT seed: Elena Vitale, Davide Russo, Chiara Lombardi
-- Auth users are created by edge function seed-demo-pts (service role).
-- This migration adds slug support + idempotent upsert RPC for profiles/data.

ALTER TABLE public.pt_profiles
  ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pt_profiles_slug_unique
  ON public.pt_profiles (slug)
  WHERE slug IS NOT NULL;

COMMENT ON COLUMN public.pt_profiles.slug IS
  'Public URL slug for PT discovery (e.g. elena-vitale). Set by demo seed.';

-- Resolve auth user id by email (SECURITY DEFINER for edge function use)
CREATE OR REPLACE FUNCTION public.get_auth_user_id_by_email(_email TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT id
  FROM auth.users
  WHERE lower(email) = lower(trim(_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_auth_user_id_by_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_auth_user_id_by_email(TEXT) TO service_role;

-- Upsert demo PT profile + optional workout templates (idempotent by email)
CREATE OR REPLACE FUNCTION public.upsert_demo_pt_seed(
  _email TEXT,
  _first_name TEXT,
  _last_name TEXT,
  _city TEXT,
  _slug TEXT,
  _bio TEXT,
  _specializations TEXT[],
  _pt_type_name TEXT,
  _rating_avg NUMERIC DEFAULT 4.7,
  _review_count INT DEFAULT 8,
  _location_lat NUMERIC DEFAULT NULL,
  _location_lng NUMERIC DEFAULT NULL,
  _max_athletes INT DEFAULT 20,
  _template_titles TEXT[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_pt_type_id UUID;
  v_tpl TEXT;
  v_templates_created INT := 0;
BEGIN
  v_user_id := public.get_auth_user_id_by_email(_email);

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'email', _email,
      'status', 'skipped_no_auth_user',
      'message', 'Run edge function seed-demo-pts to create auth user first'
    );
  END IF;

  SELECT id INTO v_pt_type_id
  FROM public.pt_types
  WHERE name = _pt_type_name
  LIMIT 1;

  INSERT INTO public.profiles (user_id, email, first_name, last_name, city)
  VALUES (v_user_id, lower(trim(_email)), _first_name, _last_name, _city)
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    city = EXCLUDED.city,
    updated_at = NOW();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'pt')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.pt_profiles (
    user_id,
    status,
    bio,
    specializations,
    pt_type_id,
    slug,
    max_athletes,
    rating_avg,
    review_count,
    location_city,
    location_country,
    location_lat,
    location_lng,
    is_discoverable,
    offers_online,
    offers_in_person,
    level,
    experience_years,
    hourly_rate,
    price_min,
    price_max
  ) VALUES (
    v_user_id,
    'attivo',
    _bio,
    _specializations,
    v_pt_type_id,
    _slug,
    _max_athletes,
    _rating_avg,
    _review_count,
    _city,
    'Italia',
    _location_lat,
    _location_lng,
    true,
    true,
    true,
    'senior',
    6,
    45.00,
    35.00,
    65.00
  )
  ON CONFLICT (user_id) DO UPDATE SET
    status = 'attivo',
    bio = EXCLUDED.bio,
    specializations = EXCLUDED.specializations,
    pt_type_id = COALESCE(EXCLUDED.pt_type_id, public.pt_profiles.pt_type_id),
    slug = EXCLUDED.slug,
    max_athletes = EXCLUDED.max_athletes,
    rating_avg = EXCLUDED.rating_avg,
    review_count = EXCLUDED.review_count,
    location_city = EXCLUDED.location_city,
    location_country = EXCLUDED.location_country,
    location_lat = EXCLUDED.location_lat,
    location_lng = EXCLUDED.location_lng,
    is_discoverable = true,
    offers_online = true,
    offers_in_person = true,
    updated_at = NOW();

  FOREACH v_tpl IN ARRAY _template_titles
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.workout_templates
      WHERE pt_user_id = v_user_id AND title = v_tpl
    ) THEN
      INSERT INTO public.workout_templates (
        pt_user_id,
        title,
        description,
        category,
        difficulty_level,
        estimated_duration,
        is_public,
        tags
      ) VALUES (
        v_user_id,
        v_tpl,
        '[seed:demo-pts] Template dimostrativo',
        'funzionale',
        'intermedio',
        45,
        false,
        ARRAY['demo', 'seed']
      );
      v_templates_created := v_templates_created + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'email', _email,
    'status', 'upserted',
    'user_id', v_user_id,
    'slug', _slug,
    'templates_created', v_templates_created
  );
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_demo_pt_seed(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, NUMERIC, INT, NUMERIC, NUMERIC, INT, TEXT[]
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_demo_pt_seed(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, NUMERIC, INT, NUMERIC, NUMERIC, INT, TEXT[]
) TO service_role;

-- Apply seed data when auth users already exist (e.g. after edge function run)
DO $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT public.upsert_demo_pt_seed(
    'elena.vitale.pt@fitplatform.com',
    'Elena', 'Vitale', 'Milano', 'elena-vitale',
    'Personal trainer specializzata in pilates e rieducazione posturale. Programmi su misura per donne che vogliono tonificare, migliorare la postura e ritrovare benessere quotidiano.',
    ARRAY['Pilates', 'Posturale', 'Allenamento femminile', 'Functional Training'],
    'Pilates',
    4.8, 14,
    45.4642, 9.1900, 20,
    ARRAY['Pilates Core & Postura', 'Functional Donna — Full Body']
  ) INTO v_result;
  RAISE NOTICE 'Elena Vitale: %', v_result;

  SELECT public.upsert_demo_pt_seed(
    'davide.russo.pt@fitplatform.com',
    'Davide', 'Russo', 'Roma', 'davide-russo',
    'Coach CrossFit e HIIT con background in preparazione atletica. Sessioni ad alta intensità per atleti intermedi e avanzati che vogliono spingersi oltre.',
    ARRAY['CrossFit', 'HIIT', 'Preparazione atletica', 'Conditioning'],
    'CrossFit',
    4.9, 22,
    41.9028, 12.4964, 20,
    ARRAY['CrossFit WOD — For Time', 'HIIT Metcon 20 min']
  ) INTO v_result;
  RAISE NOTICE 'Davide Russo: %', v_result;

  SELECT public.upsert_demo_pt_seed(
    'chiara.lombardi.pt@fitplatform.com',
    'Chiara', 'Lombardi', 'Torino', 'chiara-lombardi',
    'Strength coach e consulente nutrizionale sportivo. Percorsi strutturati per principianti: costruire forza, imparare i movimenti base e abbinare alimentazione all''allenamento.',
    ARRAY['Strength', 'Nutrizione sportiva', 'Principianti', 'Ipertrofia'],
    'Functional Training',
    4.7, 11,
    45.0703, 7.6869, 20,
    ARRAY['Strength Base — Principianti', 'Forza + Nutrizione — Settimana 1']
  ) INTO v_result;
  RAISE NOTICE 'Chiara Lombardi: %', v_result;
END $$;
