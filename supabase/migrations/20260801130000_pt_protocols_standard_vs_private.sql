-- =====================================================
-- Protocolli: STANDARD (pubblici, immutabili) vs PRIVATI (solo PT creatore)
-- =====================================================

-- Colonna is_public se manca
ALTER TABLE public.pt_protocols
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- Tutti i protocolli già creati da PT restano privati
UPDATE public.pt_protocols
SET is_public = false
WHERE pt_user_id IS NOT NULL
  AND is_public IS DISTINCT FROM true;

-- Seed protocolli STANDARD di piattaforma (is_public = true).
-- Owner = primo admin se esiste, altrimenti NULL non ammesso: usiamo un UUID fisso
-- solo se c'è almeno un admin; altrimenti skip seed (gli standard restano nel registry FE).
DO $$
DECLARE
  v_admin uuid;
BEGIN
  SELECT ur.user_id INTO v_admin
  FROM public.user_roles ur
  WHERE ur.role = 'admin'
  LIMIT 1;

  IF v_admin IS NULL THEN
    RETURN;
  END IF;

  -- Inserisci solo se non esiste già uno standard con stesso protocol_type
  INSERT INTO public.pt_protocols (pt_user_id, name, protocol_type, config, is_public, description)
  SELECT v_admin, v.name, v.ptype::public.protocol_type, '{}'::jsonb, true, v.descr
  FROM (VALUES
    ('EMOM', 'EMOM', 'Ogni minuto esegui il blocco indicato.'),
    ('AMRAP', 'AMRAP', 'Più round possibili nel tempo stabilito.'),
    ('SUPERSET', 'Superset', 'Esercizi accoppiati in sequenza.'),
    ('TABATA', 'Tabata', 'Intervalli lavoro/riposo fissi.'),
    ('HIIT', 'HIIT', 'Intervalli flessibili a rotazione.'),
    ('TOP_SET_BACKOFF', 'Top Set + Back Off', 'Serie principale + scarico.'),
    ('RAMPING', 'Ramping', 'Carico progressivo fino al KO.'),
    ('LADDER', 'Ladder', 'Scala di ripetizioni.'),
    ('DEAD_LADDER', 'Dead Ladder', 'Scala a cedimento.'),
    ('RXT', 'RxT', 'Round for time.'),
    ('RUNNING_TOTAL', 'Running Total', 'Blocchi a target reps.')
  ) AS v(ptype, name, descr)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pt_protocols p
    WHERE p.is_public = true
      AND p.protocol_type::text = v.ptype
  );
EXCEPTION
  WHEN others THEN
    -- Se protocol_type è TEXT invece di enum, riprova senza cast
    NULL;
END $$;

-- Fallback seed se protocol_type è TEXT
DO $$
DECLARE
  v_admin uuid;
BEGIN
  SELECT ur.user_id INTO v_admin
  FROM public.user_roles ur
  WHERE ur.role = 'admin'
  LIMIT 1;
  IF v_admin IS NULL THEN RETURN; END IF;

  INSERT INTO public.pt_protocols (pt_user_id, name, protocol_type, config, is_public, description)
  SELECT v_admin, v.name, v.ptype, '{}'::jsonb, true, v.descr
  FROM (VALUES
    ('EMOM', 'EMOM', 'Ogni minuto esegui il blocco indicato.'),
    ('AMRAP', 'AMRAP', 'Più round possibili nel tempo stabilito.'),
    ('SUPERSET', 'Superset', 'Esercizi accoppiati in sequenza.'),
    ('TABATA', 'Tabata', 'Intervalli lavoro/riposo fissi.'),
    ('HIIT', 'HIIT', 'Intervalli flessibili a rotazione.'),
    ('TOP_SET_BACKOFF', 'Top Set + Back Off', 'Serie principale + scarico.'),
    ('RAMPING', 'Ramping', 'Carico progressivo fino al KO.'),
    ('LADDER', 'Ladder', 'Scala di ripetizioni.'),
    ('DEAD_LADDER', 'Dead Ladder', 'Scala a cedimento.'),
    ('RXT', 'RxT', 'Round for time.'),
    ('RUNNING_TOTAL', 'Running Total', 'Blocchi a target reps.')
  ) AS v(ptype, name, descr)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pt_protocols p
    WHERE p.is_public = true
      AND p.protocol_type::text = v.ptype
  )
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN others THEN NULL;
END $$;

-- RLS: SELECT propri O standard pubblici
DROP POLICY IF EXISTS "pt_protocols_select" ON public.pt_protocols;
DROP POLICY IF EXISTS "PT manage own protocols" ON public.pt_protocols;
DROP POLICY IF EXISTS "Admins manage all pt_protocols" ON public.pt_protocols;
DROP POLICY IF EXISTS "pt_protocols_insert" ON public.pt_protocols;
DROP POLICY IF EXISTS "pt_protocols_update" ON public.pt_protocols;
DROP POLICY IF EXISTS "pt_protocols_delete" ON public.pt_protocols;

CREATE POLICY "pt_protocols_select"
  ON public.pt_protocols FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR is_public = true
    OR pt_user_id = auth.uid()
  );

-- INSERT: PT crea SOLO privati (is_public = false). Admin può creare standard.
CREATE POLICY "pt_protocols_insert"
  ON public.pt_protocols FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    OR (
      public.is_pt(auth.uid())
      AND pt_user_id = auth.uid()
      AND is_public = false
    )
  );

-- UPDATE: mai sugli standard pubblici (tranne admin). PT solo i propri privati.
CREATE POLICY "pt_protocols_update"
  ON public.pt_protocols FOR UPDATE TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR (
      public.is_pt(auth.uid())
      AND pt_user_id = auth.uid()
      AND is_public = false
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR (
      public.is_pt(auth.uid())
      AND pt_user_id = auth.uid()
      AND is_public = false
    )
  );

-- DELETE: mai sugli standard (tranne admin). PT solo i propri privati.
CREATE POLICY "pt_protocols_delete"
  ON public.pt_protocols FOR DELETE TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR (
      public.is_pt(auth.uid())
      AND pt_user_id = auth.uid()
      AND is_public = false
    )
  );

-- Preferiti: solo sui protocolli che il PT può vedere (RLS fa il resto)
DROP POLICY IF EXISTS "pt_favorite_protocols_all" ON public.pt_favorite_protocols;
DROP POLICY IF EXISTS "PT view own favorite protocols" ON public.pt_favorite_protocols;
DROP POLICY IF EXISTS "PT add own favorite protocols" ON public.pt_favorite_protocols;
DROP POLICY IF EXISTS "PT remove own favorite protocols" ON public.pt_favorite_protocols;
DROP POLICY IF EXISTS "Admins view all favorite protocols" ON public.pt_favorite_protocols;

CREATE POLICY "pt_favorite_protocols_select"
  ON public.pt_favorite_protocols FOR SELECT TO authenticated
  USING (pt_user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "pt_favorite_protocols_insert"
  ON public.pt_favorite_protocols FOR INSERT TO authenticated
  WITH CHECK (
    pt_user_id = auth.uid()
    AND public.is_pt(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.pt_protocols p
      WHERE p.id = protocol_id
        AND (p.pt_user_id = auth.uid() OR p.is_public = true)
    )
  );

CREATE POLICY "pt_favorite_protocols_delete"
  ON public.pt_favorite_protocols FOR DELETE TO authenticated
  USING (pt_user_id = auth.uid() AND public.is_pt(auth.uid()));

NOTIFY pgrst, 'reload schema';
