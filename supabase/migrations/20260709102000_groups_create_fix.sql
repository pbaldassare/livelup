-- =====================================================
-- Fix creazione gruppi: bucket storage, RLS discipline, RPC atomica
-- =====================================================

-- Bucket immagini gruppo (policy già presenti da migration Lovable)
INSERT INTO storage.buckets (id, name, public)
VALUES ('group-images', 'group-images', true)
ON CONFLICT (id) DO NOTHING;

-- Permette al creatore di inserire discipline subito dopo la creazione
CREATE POLICY "group_disciplines_insert_owner"
  ON public.group_disciplines FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_id AND g.owner_user_id = auth.uid()
    )
  );

-- Creazione atomica gruppo + discipline (bypassa race RLS client-side)
CREATE OR REPLACE FUNCTION public.create_group_with_disciplines(
  _name text,
  _description text DEFAULT NULL,
  _image_url text DEFAULT NULL,
  _location_name text DEFAULT NULL,
  _latitude double precision DEFAULT NULL,
  _longitude double precision DEFAULT NULL,
  _visibility public.group_visibility DEFAULT 'public',
  _discipline_ids uuid[] DEFAULT '{}',
  _policy_accepted boolean DEFAULT false
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
  public.group_visibility, uuid[], boolean
) TO authenticated;
