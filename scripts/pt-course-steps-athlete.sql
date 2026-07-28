-- PT Courses — athlete step progress
-- Copia su Lovable Cloud SQL editor se la migration non è ancora applicata.
-- (contenuto allineato a supabase/migrations/20260728150000_pt_course_steps_athlete.sql)

CREATE TABLE IF NOT EXISTS public.pt_course_step_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.pt_course_enrollments(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.pt_course_steps(id) ON DELETE CASCADE,
  atleta_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'locked'
    CHECK (status IN ('locked', 'in_progress', 'completed')),
  progress_pct INTEGER NOT NULL DEFAULT 0
    CHECK (progress_pct >= 0 AND progress_pct <= 100),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, step_id)
);

COMMENT ON TABLE public.pt_course_step_progress IS
  'Progresso atleta per step di un corso PT (stati: locked, in_progress, completed).';

CREATE INDEX IF NOT EXISTS idx_pt_course_step_progress_athlete
  ON public.pt_course_step_progress (atleta_user_id);

CREATE INDEX IF NOT EXISTS idx_pt_course_step_progress_enrollment
  ON public.pt_course_step_progress (enrollment_id);

CREATE INDEX IF NOT EXISTS idx_pt_course_step_progress_step
  ON public.pt_course_step_progress (step_id);

DROP TRIGGER IF EXISTS update_pt_course_step_progress_updated_at ON public.pt_course_step_progress;
CREATE TRIGGER update_pt_course_step_progress_updated_at
  BEFORE UPDATE ON public.pt_course_step_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.pt_course_step_progress ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pt_course_step_progress TO authenticated;

DROP POLICY IF EXISTS "Athlete manages own course step progress" ON public.pt_course_step_progress;
CREATE POLICY "Athlete manages own course step progress"
  ON public.pt_course_step_progress FOR ALL TO authenticated
  USING (auth.uid() = atleta_user_id)
  WITH CHECK (auth.uid() = atleta_user_id);

DROP POLICY IF EXISTS "PT views step progress of own courses" ON public.pt_course_step_progress;
CREATE POLICY "PT views step progress of own courses"
  ON public.pt_course_step_progress FOR SELECT TO authenticated
  USING (
    public.is_pt(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.pt_course_enrollments e
      WHERE e.id = pt_course_step_progress.enrollment_id
        AND public.is_pt_course_owner(e.course_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage all pt course step progress" ON public.pt_course_step_progress;
CREATE POLICY "Admins can manage all pt course step progress"
  ON public.pt_course_step_progress FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view published course author profiles" ON public.profiles;
CREATE POLICY "Anyone can view published course author profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.pt_courses c
      WHERE c.pt_user_id = profiles.user_id
        AND c.status = 'published'
    )
  );
