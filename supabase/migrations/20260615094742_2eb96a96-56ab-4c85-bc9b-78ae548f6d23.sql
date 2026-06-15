
-- =====================================================
-- 1) ANAGRAFICA ESTESA
-- =====================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS fiscal_code TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;

ALTER TABLE public.atleta_profiles
  ADD COLUMN IF NOT EXISTS bio TEXT;

-- =====================================================
-- 2) PT puo' aggiornare profilo / atleta_profile dei propri atleti
-- =====================================================
DROP POLICY IF EXISTS "PT can update connected atleta profile" ON public.profiles;
CREATE POLICY "PT can update connected atleta profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_pt(auth.uid()) AND public.is_connected_to_pt(user_id, auth.uid()))
  WITH CHECK (public.is_pt(auth.uid()) AND public.is_connected_to_pt(user_id, auth.uid()));

DROP POLICY IF EXISTS "PT can update connected atleta data" ON public.atleta_profiles;
CREATE POLICY "PT can update connected atleta data"
  ON public.atleta_profiles FOR UPDATE
  TO authenticated
  USING (public.is_pt(auth.uid()) AND public.is_connected_to_pt(user_id, auth.uid()))
  WITH CHECK (public.is_pt(auth.uid()) AND public.is_connected_to_pt(user_id, auth.uid()));

-- =====================================================
-- 3) PT_ATHLETE_NOTES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pt_athlete_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  atleta_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  body TEXT NOT NULL,
  tag TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pt_notes_pt_athlete
  ON public.pt_athlete_notes (pt_user_id, atleta_user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pt_athlete_notes TO authenticated;
GRANT ALL ON public.pt_athlete_notes TO service_role;

ALTER TABLE public.pt_athlete_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PT can manage own notes"
  ON public.pt_athlete_notes FOR ALL
  TO authenticated
  USING (pt_user_id = auth.uid())
  WITH CHECK (pt_user_id = auth.uid());

CREATE POLICY "Admins can view all PT notes"
  ON public.pt_athlete_notes FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_pt_athlete_notes_updated_at
  BEFORE UPDATE ON public.pt_athlete_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 4) ATHLETE_DOCUMENTS
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.athlete_doc_type AS ENUM (
    'visita_medica',
    'certificato_agonistico',
    'assicurazione',
    'consenso_privacy',
    'altro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.athlete_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploaded_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  doc_type public.athlete_doc_type NOT NULL DEFAULT 'altro',
  title TEXT NOT NULL,
  file_path TEXT,
  issued_date DATE,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_athlete_documents_atleta
  ON public.athlete_documents (atleta_user_id, expiry_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.athlete_documents TO authenticated;
GRANT ALL ON public.athlete_documents TO service_role;

ALTER TABLE public.athlete_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Atleta sees own documents"
  ON public.athlete_documents FOR SELECT
  TO authenticated
  USING (atleta_user_id = auth.uid());

CREATE POLICY "Connected PT sees athlete documents"
  ON public.athlete_documents FOR SELECT
  TO authenticated
  USING (public.is_pt(auth.uid()) AND public.is_connected_to_pt(atleta_user_id, auth.uid()));

CREATE POLICY "Atleta can insert own documents"
  ON public.athlete_documents FOR INSERT
  TO authenticated
  WITH CHECK (atleta_user_id = auth.uid() AND uploaded_by_user_id = auth.uid());

CREATE POLICY "Connected PT can insert athlete documents"
  ON public.athlete_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_pt(auth.uid())
    AND public.is_connected_to_pt(atleta_user_id, auth.uid())
    AND uploaded_by_user_id = auth.uid()
  );

CREATE POLICY "Owner or connected PT can update documents"
  ON public.athlete_documents FOR UPDATE
  TO authenticated
  USING (
    atleta_user_id = auth.uid()
    OR (public.is_pt(auth.uid()) AND public.is_connected_to_pt(atleta_user_id, auth.uid()))
  )
  WITH CHECK (
    atleta_user_id = auth.uid()
    OR (public.is_pt(auth.uid()) AND public.is_connected_to_pt(atleta_user_id, auth.uid()))
  );

CREATE POLICY "Owner or connected PT can delete documents"
  ON public.athlete_documents FOR DELETE
  TO authenticated
  USING (
    atleta_user_id = auth.uid()
    OR (public.is_pt(auth.uid()) AND public.is_connected_to_pt(atleta_user_id, auth.uid()))
  );

CREATE POLICY "Admin manages all athlete documents"
  ON public.athlete_documents FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_athlete_documents_updated_at
  BEFORE UPDATE ON public.athlete_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 5) STORAGE POLICIES (bucket athlete-documents - private)
-- Path: <atleta_user_id>/<filename>
-- =====================================================
DROP POLICY IF EXISTS "athlete-docs-select" ON storage.objects;
CREATE POLICY "athlete-docs-select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'athlete-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        public.is_pt(auth.uid())
        AND public.is_connected_to_pt(((storage.foldername(name))[1])::uuid, auth.uid())
      )
      OR public.is_admin(auth.uid())
    )
  );

DROP POLICY IF EXISTS "athlete-docs-insert" ON storage.objects;
CREATE POLICY "athlete-docs-insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'athlete-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        public.is_pt(auth.uid())
        AND public.is_connected_to_pt(((storage.foldername(name))[1])::uuid, auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "athlete-docs-delete" ON storage.objects;
CREATE POLICY "athlete-docs-delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'athlete-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        public.is_pt(auth.uid())
        AND public.is_connected_to_pt(((storage.foldername(name))[1])::uuid, auth.uid())
      )
      OR public.is_admin(auth.uid())
    )
  );
