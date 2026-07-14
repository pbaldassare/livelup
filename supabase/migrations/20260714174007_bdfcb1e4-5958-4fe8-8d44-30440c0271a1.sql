
DO $$
DECLARE
  v_pt uuid := '76c207f5-ba7d-48d7-a7f2-c95f4819aebd';
  v_atleta record;
  v_existing_id uuid;
  v_existing_status text;
BEGIN
  FOR v_atleta IN
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role = 'atleta'
      AND ur.user_id <> v_pt
  LOOP
    SELECT id, status INTO v_existing_id, v_existing_status
    FROM public.pt_atleta_connections
    WHERE pt_user_id = v_pt AND atleta_user_id = v_atleta.user_id
    LIMIT 1;

    IF v_existing_id IS NULL THEN
      INSERT INTO public.pt_atleta_connections (
        pt_user_id, atleta_user_id, requested_by, status, accepted_at
      ) VALUES (
        v_pt, v_atleta.user_id, v_pt, 'active', now()
      );
    ELSIF v_existing_status <> 'active' THEN
      UPDATE public.pt_atleta_connections
      SET status = 'active',
          accepted_at = COALESCE(accepted_at, now()),
          terminated_at = NULL,
          updated_at = now()
      WHERE id = v_existing_id;
    END IF;
  END LOOP;
END $$;
