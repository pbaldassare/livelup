-- Cataloghi esercizi: visibilità pubblica + condivisione con altri PT + revoca.
-- Destinatari: sola lettura. Solo il proprietario modifica/elimina e gestisce le share.

ALTER TABLE public.exercise_catalogs
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_exercise_catalogs_public
  ON public.exercise_catalogs (is_public)
  WHERE is_public = true;

COMMENT ON COLUMN public.exercise_catalogs.is_public IS
  'Se true, il catalogo è visibile in sola lettura a tutti i PT della piattaforma.';

CREATE TABLE IF NOT EXISTS public.exercise_catalog_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id UUID NOT NULL REFERENCES public.exercise_catalogs(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (catalog_id, shared_with_user_id)
);

COMMENT ON TABLE public.exercise_catalog_shares IS
  'Condivisione catalogo PT → altro PT (revocabile). Non include atleti.';

CREATE INDEX IF NOT EXISTS idx_exercise_catalog_shares_catalog
  ON public.exercise_catalog_shares (catalog_id);

CREATE INDEX IF NOT EXISTS idx_exercise_catalog_shares_recipient
  ON public.exercise_catalog_shares (shared_with_user_id);

ALTER TABLE public.exercise_catalog_shares ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.exercise_catalog_shares TO authenticated;

CREATE OR REPLACE FUNCTION public.pt_can_access_exercise_catalog(_catalog_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin(auth.uid())
    OR (
      public.is_pt(auth.uid())
      AND EXISTS (
        SELECT 1
        FROM public.exercise_catalogs c
        WHERE c.id = _catalog_id
          AND (
            c.pt_user_id = auth.uid()
            OR c.is_public = true
            OR EXISTS (
              SELECT 1
              FROM public.exercise_catalog_shares s
              WHERE s.catalog_id = c.id
                AND s.shared_with_user_id = auth.uid()
            )
          )
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.pt_can_access_exercise_catalog(UUID) TO authenticated;

DROP POLICY IF EXISTS "PT can view own catalogs" ON public.exercise_catalogs;
DROP POLICY IF EXISTS "PT can view accessible catalogs" ON public.exercise_catalogs;
CREATE POLICY "PT can view accessible catalogs"
  ON public.exercise_catalogs FOR SELECT TO authenticated
  USING (public.pt_can_access_exercise_catalog(id));

DROP POLICY IF EXISTS "PT can view own catalog items" ON public.exercise_catalog_items;
DROP POLICY IF EXISTS "PT can view accessible catalog items" ON public.exercise_catalog_items;
CREATE POLICY "PT can view accessible catalog items"
  ON public.exercise_catalog_items FOR SELECT TO authenticated
  USING (public.pt_can_access_exercise_catalog(catalog_id));

DROP POLICY IF EXISTS "PT can view exercises in accessible catalogs" ON public.exercises;
CREATE POLICY "PT can view exercises in accessible catalogs"
  ON public.exercises FOR SELECT TO authenticated
  USING (
    public.is_pt(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.exercise_catalog_items i
      WHERE i.exercise_id = exercises.id
        AND public.pt_can_access_exercise_catalog(i.catalog_id)
    )
  );

DROP POLICY IF EXISTS "Owner can view catalog shares" ON public.exercise_catalog_shares;
CREATE POLICY "Owner can view catalog shares"
  ON public.exercise_catalog_shares FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR shared_with_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.exercise_catalogs c
      WHERE c.id = exercise_catalog_shares.catalog_id
        AND c.pt_user_id = auth.uid()
        AND public.is_pt(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owner can create catalog shares" ON public.exercise_catalog_shares;
CREATE POLICY "Owner can create catalog shares"
  ON public.exercise_catalog_shares FOR INSERT TO authenticated
  WITH CHECK (
    public.is_pt(auth.uid())
    AND public.is_pt(shared_with_user_id)
    AND shared_with_user_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.exercise_catalogs c
      WHERE c.id = catalog_id
        AND c.pt_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owner or recipient can revoke catalog shares" ON public.exercise_catalog_shares;
CREATE POLICY "Owner or recipient can revoke catalog shares"
  ON public.exercise_catalog_shares FOR DELETE TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR shared_with_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.exercise_catalogs c
      WHERE c.id = exercise_catalog_shares.catalog_id
        AND c.pt_user_id = auth.uid()
        AND public.is_pt(auth.uid())
    )
  );
