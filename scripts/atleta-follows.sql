-- Atleta Follows: "Seguiti" — preferiti salvati dall'atleta (eventi, corsi, gruppi, PT, professionisti)
-- Copia su Lovable Cloud SQL editor se la migration non è ancora applicata.
-- (contenuto identico a supabase/migrations/20260728170000_atleta_follows.sql)

CREATE TABLE IF NOT EXISTS public.atleta_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  ALTER TABLE public.atleta_follows
    ADD CONSTRAINT atleta_follows_target_type_check
    CHECK (target_type IN ('event', 'course', 'group', 'pt', 'professional'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.atleta_follows
    ADD CONSTRAINT atleta_follows_unique
    UNIQUE (atleta_user_id, target_type, target_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_atleta_follows_user ON public.atleta_follows(atleta_user_id);
CREATE INDEX IF NOT EXISTS idx_atleta_follows_target ON public.atleta_follows(target_type, target_id);

-- -----------------------------------------------------
-- RLS: solo il proprietario della riga può leggere/scrivere/cancellare
-- -----------------------------------------------------

ALTER TABLE public.atleta_follows ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.atleta_follows TO authenticated;

DROP POLICY IF EXISTS "atleta_follows_select_own" ON public.atleta_follows;
CREATE POLICY "atleta_follows_select_own"
  ON public.atleta_follows FOR SELECT TO authenticated
  USING (atleta_user_id = auth.uid());

DROP POLICY IF EXISTS "atleta_follows_insert_own" ON public.atleta_follows;
CREATE POLICY "atleta_follows_insert_own"
  ON public.atleta_follows FOR INSERT TO authenticated
  WITH CHECK (atleta_user_id = auth.uid());

DROP POLICY IF EXISTS "atleta_follows_delete_own" ON public.atleta_follows;
CREATE POLICY "atleta_follows_delete_own"
  ON public.atleta_follows FOR DELETE TO authenticated
  USING (atleta_user_id = auth.uid());
