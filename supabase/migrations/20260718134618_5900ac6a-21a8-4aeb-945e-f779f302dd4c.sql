CREATE TABLE IF NOT EXISTS public.exercise_catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id UUID NOT NULL REFERENCES public.exercise_catalogs(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (catalog_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_exercise_catalog_items_catalog ON public.exercise_catalog_items (catalog_id);
CREATE INDEX IF NOT EXISTS idx_exercise_catalog_items_exercise ON public.exercise_catalog_items (exercise_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_catalog_items TO authenticated;
GRANT ALL ON public.exercise_catalog_items TO service_role;

ALTER TABLE public.exercise_catalog_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "PT can view own catalog items" ON public.exercise_catalog_items;
CREATE POLICY "PT can view own catalog items"
  ON public.exercise_catalog_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.exercise_catalogs c WHERE c.id = exercise_catalog_items.catalog_id AND c.pt_user_id = auth.uid() AND public.is_pt(auth.uid())));

DROP POLICY IF EXISTS "PT can add own catalog items" ON public.exercise_catalog_items;
CREATE POLICY "PT can add own catalog items"
  ON public.exercise_catalog_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.exercise_catalogs c WHERE c.id = exercise_catalog_items.catalog_id AND c.pt_user_id = auth.uid() AND public.is_pt(auth.uid())));

DROP POLICY IF EXISTS "PT can delete own catalog items" ON public.exercise_catalog_items;
CREATE POLICY "PT can delete own catalog items"
  ON public.exercise_catalog_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.exercise_catalogs c WHERE c.id = exercise_catalog_items.catalog_id AND c.pt_user_id = auth.uid() AND public.is_pt(auth.uid())));

DROP POLICY IF EXISTS "Admins can view all catalog items" ON public.exercise_catalog_items;
CREATE POLICY "Admins can view all catalog items"
  ON public.exercise_catalog_items FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));