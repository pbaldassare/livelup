-- =====================================================
-- Fix creazione chat di gruppo PT:
-- RPC atomica (gruppo + membri) SECURITY DEFINER.
-- Evita race/RLS sul client (insert gruppo + insert membri).
-- Idempotente.
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_pt_chat_group(
  _name text,
  _athlete_ids uuid[]
)
RETURNS public.pt_chat_groups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_group public.pt_chat_groups;
  v_athlete uuid;
  v_ids uuid[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;

  IF NOT public.is_pt(v_uid) THEN
    RAISE EXCEPTION 'Solo i Personal Trainer possono creare gruppi chat';
  END IF;

  IF _name IS NULL OR btrim(_name) = '' THEN
    RAISE EXCEPTION 'Il nome del gruppo è obbligatorio';
  END IF;

  IF _athlete_ids IS NULL OR coalesce(cardinality(_athlete_ids), 0) = 0 THEN
    RAISE EXCEPTION 'Seleziona almeno un atleta';
  END IF;

  SELECT ARRAY(SELECT DISTINCT x FROM unnest(_athlete_ids) AS t(x) WHERE x IS NOT NULL)
  INTO v_ids;

  IF coalesce(cardinality(v_ids), 0) = 0 THEN
    RAISE EXCEPTION 'Seleziona almeno un atleta';
  END IF;

  FOREACH v_athlete IN ARRAY v_ids
  LOOP
    IF NOT public.are_connected(v_uid, v_athlete) THEN
      RAISE EXCEPTION 'Puoi aggiungere solo atleti collegati';
    END IF;
  END LOOP;

  INSERT INTO public.pt_chat_groups (pt_user_id, name)
  VALUES (v_uid, btrim(_name))
  RETURNING * INTO v_group;

  FOREACH v_athlete IN ARRAY v_ids
  LOOP
    INSERT INTO public.pt_chat_group_members (group_id, atleta_user_id)
    VALUES (v_group.id, v_athlete)
    ON CONFLICT (group_id, atleta_user_id) DO NOTHING;
  END LOOP;

  RETURN v_group;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_pt_chat_group(text, uuid[]) TO authenticated;
