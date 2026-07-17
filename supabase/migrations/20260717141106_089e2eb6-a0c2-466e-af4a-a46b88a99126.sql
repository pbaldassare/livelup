CREATE TABLE IF NOT EXISTS public.exercise_catalogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🗂️',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercise_catalogs_pt_user
  ON public.exercise_catalogs (pt_user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_catalogs TO authenticated;
GRANT ALL ON public.exercise_catalogs TO service_role;

ALTER TABLE public.exercise_catalogs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "PT can view own catalogs" ON public.exercise_catalogs;
CREATE POLICY "PT can view own catalogs"
  ON public.exercise_catalogs FOR SELECT TO authenticated
  USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

DROP POLICY IF EXISTS "PT can create own catalogs" ON public.exercise_catalogs;
CREATE POLICY "PT can create own catalogs"
  ON public.exercise_catalogs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

DROP POLICY IF EXISTS "PT can update own catalogs" ON public.exercise_catalogs;
CREATE POLICY "PT can update own catalogs"
  ON public.exercise_catalogs FOR UPDATE TO authenticated
  USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()))
  WITH CHECK (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

DROP POLICY IF EXISTS "PT can delete own catalogs" ON public.exercise_catalogs;
CREATE POLICY "PT can delete own catalogs"
  ON public.exercise_catalogs FOR DELETE TO authenticated
  USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all catalogs" ON public.exercise_catalogs;
CREATE POLICY "Admins can view all catalogs"
  ON public.exercise_catalogs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS set_exercise_catalogs_updated_at ON public.exercise_catalogs;
CREATE TRIGGER set_exercise_catalogs_updated_at
  BEFORE UPDATE ON public.exercise_catalogs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();