-- =====================================================
-- Gruppi: nome luogo, indirizzo opzionale, RPC estesa
-- =====================================================

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS place_label text,
  ADD COLUMN IF NOT EXISTS address_line text;

COMMENT ON COLUMN public.groups.place_label IS 'Nome luogo mostrato (parco, spiaggia, palestra...)';
COMMENT ON COLUMN public.groups.address_line IS 'Via/indirizzo opzionale';

DROP FUNCTION IF EXISTS public.create_group_with_disciplines(
  text, text, text, text, double precision, double precision,
  public.group_visibility, uuid[], boolean
);

CREATE OR REPLACE FUNCTION public.create_group_with_disciplines(
  _name text,
  _description text DEFAULT NULL,
  _image_url text DEFAULT NULL,
  _location_name text DEFAULT NULL,
  _latitude double precision DEFAULT NULL,
  _longitude double precision DEFAULT NULL,
  _visibility public.group_visibility DEFAULT 'public',
  _discipline_ids uuid[] DEFAULT '{}',
  _policy_accepted boolean DEFAULT false,
  _place_label text DEFAULT NULL,
  _address_line text DEFAULT NULL
)
RETURNS public.groups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_group public.groups;
  v_disc uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;

  IF NOT COALESCE(_policy_accepted, false) THEN
    RAISE EXCEPTION 'Devi accettare le policy di LivelApp per creare un gruppo';
  END IF;

  IF _name IS NULL OR trim(_name) = '' THEN
    RAISE EXCEPTION 'Il nome del gruppo è obbligatorio';
  END IF;

  IF _discipline_ids IS NULL OR array_length(_discipline_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Seleziona almeno una disciplina';
  END IF;

  INSERT INTO public.groups (
    owner_user_id,
    name,
    description,
    image_url,
    place_label,
    address_line,
    location_name,
    latitude,
    longitude,
    visibility,
    policy_accepted_at
  ) VALUES (
    v_uid,
    trim(_name),
    NULLIF(trim(COALESCE(_description, '')), ''),
    _image_url,
    NULLIF(trim(COALESCE(_place_label, '')), ''),
    NULLIF(trim(COALESCE(_address_line, '')), ''),
    NULLIF(trim(COALESCE(_location_name, '')), ''),
    _latitude,
    _longitude,
    COALESCE(_visibility, 'public'::public.group_visibility),
    now()
  )
  RETURNING * INTO v_group;

  FOREACH v_disc IN ARRAY _discipline_ids
  LOOP
    INSERT INTO public.group_disciplines (group_id, pt_type_id)
    VALUES (v_group.id, v_disc)
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN v_group;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_group_with_disciplines(
  text, text, text, text, double precision, double precision,
  public.group_visibility, uuid[], boolean, text, text
) TO authenticated;
