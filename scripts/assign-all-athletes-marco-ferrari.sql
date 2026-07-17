-- =============================================================================
-- Assign ALL atleti to PT Marco Ferrari (LIVELLAPP)
-- PT user_id: 76c207f5-ba7d-48d7-a7f2-c95f4819aebd
-- PT email:    marco.ferrari.pt@gmail.com
--
-- Run in Lovable Cloud SQL editor or via Supabase CLI against project uiowzycolsmgcsvihmhy
-- Safe to re-run (idempotent).
-- =============================================================================

-- 1) BEFORE: list all atleti
SELECT
  ur.user_id,
  p.email,
  TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) AS full_name,
  ap.status AS atleta_profile_status
FROM public.user_roles ur
JOIN public.profiles p ON p.user_id = ur.user_id
LEFT JOIN public.atleta_profiles ap ON ap.user_id = ur.user_id
WHERE ur.role = 'atleta'
ORDER BY p.email;

-- 2) BEFORE: current connections for Marco Ferrari
SELECT
  c.id,
  c.status,
  p.email,
  TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) AS full_name
FROM public.pt_atleta_connections c
JOIN public.profiles p ON p.user_id = c.atleta_user_id
WHERE c.pt_user_id = '76c207f5-ba7d-48d7-a7f2-c95f4819aebd'
ORDER BY c.status, p.email;

-- 3) ASSIGN: link every atleta to Marco Ferrari
DO $$
DECLARE
  v_pt_id UUID := '76c207f5-ba7d-48d7-a7f2-c95f4819aebd';
  v_atleta RECORD;
  v_linked INT := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_pt_id) THEN
    RAISE EXCEPTION 'PT Marco Ferrari (%) not found', v_pt_id;
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

  UPDATE public.atleta_profiles ap
  SET status = 'collegato', updated_at = NOW()
  WHERE ap.user_id IN (SELECT user_id FROM public.user_roles WHERE role = 'atleta')
    AND ap.status IS DISTINCT FROM 'collegato';

  RAISE NOTICE 'Total athletes linked to Marco Ferrari: %', v_linked;
END $$;

-- 4) AFTER: verify active connections for Marco Ferrari
SELECT
  p.email,
  TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) AS full_name,
  c.status,
  c.accepted_at
FROM public.pt_atleta_connections c
JOIN public.profiles p ON p.user_id = c.atleta_user_id
WHERE c.pt_user_id = '76c207f5-ba7d-48d7-a7f2-c95f4819aebd'
  AND c.status = 'active'
ORDER BY p.email;

-- 5) AFTER: count summary
SELECT COUNT(*) AS active_athletes_for_marco_ferrari
FROM public.pt_atleta_connections
WHERE pt_user_id = '76c207f5-ba7d-48d7-a7f2-c95f4819aebd'
  AND status = 'active';
