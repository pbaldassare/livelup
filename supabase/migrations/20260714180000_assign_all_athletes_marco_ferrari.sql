-- Idempotent: assign every atleta user to PT Marco Ferrari (76c207f5-ba7d-48d7-a7f2-c95f4819aebd)
-- Respects enforce_single_pt_connection (BEFORE trigger terminates other active PT links)
-- and update_atleta_status_on_connection (sets atleta_profiles.status = 'collegato')

DO $$
DECLARE
  v_pt_id UUID := '76c207f5-ba7d-48d7-a7f2-c95f4819aebd';
  v_atleta RECORD;
  v_linked INT := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_pt_id) THEN
    RAISE NOTICE 'PT Marco Ferrari not found — skipping athlete assignment';
    RETURN;
  END IF;

  FOR v_atleta IN
    SELECT ur.user_id, p.email, p.first_name, p.last_name
    FROM public.user_roles ur
    INNER JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.role = 'atleta'
    ORDER BY COALESCE(p.first_name, ''), COALESCE(p.last_name, ''), p.email
  LOOP
    INSERT INTO public.pt_atleta_connections (
      pt_user_id,
      atleta_user_id,
      status,
      requested_by,
      accepted_at
    ) VALUES (
      v_pt_id,
      v_atleta.user_id,
      'active',
      v_pt_id,
      NOW()
    )
    ON CONFLICT (pt_user_id, atleta_user_id)
    DO UPDATE SET
      status = 'active',
      accepted_at = COALESCE(public.pt_atleta_connections.accepted_at, NOW()),
      terminated_at = NULL,
      updated_at = NOW()
    WHERE public.pt_atleta_connections.status IS DISTINCT FROM 'active';

    v_linked := v_linked + 1;
    RAISE NOTICE 'Linked athlete: % % (%)',
      COALESCE(v_atleta.first_name, ''),
      COALESCE(v_atleta.last_name, ''),
      v_atleta.email;
  END LOOP;

  -- Safety net: ensure all atleti show as collegato after assignment
  UPDATE public.atleta_profiles ap
  SET status = 'collegato', updated_at = NOW()
  WHERE ap.user_id IN (SELECT user_id FROM public.user_roles WHERE role = 'atleta')
    AND ap.status IS DISTINCT FROM 'collegato';

  RAISE NOTICE 'Total athletes linked to Marco Ferrari: %', v_linked;
END $$;
