-- =====================================================
-- BLOG & Q&A — estensione schema blog_posts
-- Copia su Lovable Cloud SQL editor se la migration non è ancora applicata.
-- - post_type: article | curiosity | qa
-- - status: draft | published | hidden (hidden = nascosto da admin, non cancellato)
-- - author_kind: pt | nutrizionista | fisioterapista | admin (etichetta autore)
-- - professional_profile_id: collega il post a un professionista (professional_profiles)
--   quando il post è pubblicato/curato per conto di un nutrizionista/fisioterapista
--   che non ha ancora un account di accesso proprio.
-- Nota: la colonna pt_user_id resta l'id autore (storico il nome, oggi generico:
-- PT, admin o utente collegato a un professional_profiles).
-- =====================================================

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'article',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS author_kind TEXT NOT NULL DEFAULT 'pt',
  ADD COLUMN IF NOT EXISTS professional_profile_id UUID REFERENCES public.professional_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hidden_by UUID;

DO $$
BEGIN
  ALTER TABLE public.blog_posts
    ADD CONSTRAINT blog_posts_post_type_check CHECK (post_type IN ('article', 'curiosity', 'qa'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.blog_posts
    ADD CONSTRAINT blog_posts_status_check CHECK (status IN ('draft', 'published', 'hidden'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.blog_posts
    ADD CONSTRAINT blog_posts_author_kind_check CHECK (author_kind IN ('pt', 'nutrizionista', 'fisioterapista', 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Backfill stato dai dati esistenti (is_published booleano legacy)
UPDATE public.blog_posts
SET status = 'published'
WHERE is_published = true AND status = 'draft';

COMMENT ON COLUMN public.blog_posts.post_type IS 'article | curiosity | qa';
COMMENT ON COLUMN public.blog_posts.status IS 'draft | published | hidden (hidden = nascosto da admin senza cancellare)';
COMMENT ON COLUMN public.blog_posts.author_kind IS 'Etichetta ruolo autore: pt | nutrizionista | fisioterapista | admin';
COMMENT ON COLUMN public.blog_posts.pt_user_id IS 'Autore del contenuto (PT, admin o utente collegato a professional_profiles) — nome colonna storico';

CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts (status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_post_type ON public.blog_posts (post_type);
CREATE INDEX IF NOT EXISTS idx_blog_posts_professional_profile_id ON public.blog_posts (professional_profile_id);

-- Mantiene is_published/published_at/hidden_at in sync con status
CREATE OR REPLACE FUNCTION public.sync_blog_post_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.is_published := (NEW.status = 'published');

  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;

  IF NEW.status = 'hidden' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'hidden') THEN
    NEW.hidden_at := now();
  ELSIF NEW.status <> 'hidden' THEN
    NEW.hidden_at := NULL;
    NEW.hidden_by := NULL;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS blog_posts_sync_status ON public.blog_posts;
CREATE TRIGGER blog_posts_sync_status
BEFORE INSERT OR UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.sync_blog_post_status();

-- =====================================================
-- RLS: autori (PT, professionisti con account, admin) gestiscono i propri
-- contenuti; l'admin gestisce (incl. nascondere/cancellare) tutti i contenuti.
-- =====================================================

DROP POLICY IF EXISTS "PT can manage own blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Anyone can view published blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can manage all blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authors can manage own blog posts" ON public.blog_posts;

CREATE POLICY "Authors can manage own blog posts"
ON public.blog_posts FOR ALL
TO authenticated
USING (
  auth.uid() = pt_user_id
  AND (
    public.is_pt(auth.uid())
    OR public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.professional_profiles pp WHERE pp.user_id = auth.uid())
  )
)
WITH CHECK (
  auth.uid() = pt_user_id
  AND (
    public.is_pt(auth.uid())
    OR public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.professional_profiles pp WHERE pp.user_id = auth.uid())
  )
);

CREATE POLICY "Admins can manage all blog posts"
ON public.blog_posts FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Anyone can view published blog posts"
ON public.blog_posts FOR SELECT
TO public
USING (status = 'published');
