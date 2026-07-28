-- PT Courses Steps (modello step-based)
-- Copia su Lovable Cloud SQL editor se la migration non è ancora applicata.
-- (contenuto identico a supabase/migrations/20260728140000_pt_courses_steps.sql)
-- Evolves pt_courses + pt_course_steps + pt_course_step_exercises
-- =====================================================

-- -----------------------------------------------------
-- 1) Evolve pt_courses
-- -----------------------------------------------------

ALTER TABLE public.pt_courses
  ADD COLUMN IF NOT EXISTS target_exercise TEXT;

ALTER TABLE public.pt_courses
  ADD COLUMN IF NOT EXISTS requires_sequential_steps BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.pt_courses.target_exercise IS
  'Skill / esercizio obiettivo del corso (testo libero, es. Muscle-up).';
COMMENT ON COLUMN public.pt_courses.requires_sequential_steps IS
  'Se true, gli step devono essere completati in ordine.';

-- -----------------------------------------------------
-- 2) pt_course_steps
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pt_course_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.pt_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  completion_threshold INTEGER NOT NULL DEFAULT 100
    CHECK (completion_threshold >= 0 AND completion_threshold <= 100),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pt_course_steps IS
  'Step di un corso PT (modello prodotto; sostitutivo funzionale dei moduli).';

CREATE INDEX IF NOT EXISTS idx_pt_course_steps_course
  ON public.pt_course_steps (course_id, order_index);

-- -----------------------------------------------------
-- 3) pt_course_step_exercises
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pt_course_step_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES public.pt_course_steps(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
  order_index INTEGER NOT NULL DEFAULT 0,
  sets INTEGER,
  reps TEXT,
  rest_seconds INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pt_course_step_exercises IS
  'Esercizi prescritti all''interno di uno step corso PT.';

CREATE INDEX IF NOT EXISTS idx_pt_course_step_exercises_step
  ON public.pt_course_step_exercises (step_id, order_index);

CREATE INDEX IF NOT EXISTS idx_pt_course_step_exercises_exercise
  ON public.pt_course_step_exercises (exercise_id);

-- -----------------------------------------------------
-- 4) Progress: support step_id (keep lesson_id for legacy)
-- -----------------------------------------------------

ALTER TABLE public.pt_course_progress
  ALTER COLUMN lesson_id DROP NOT NULL;

ALTER TABLE public.pt_course_progress
  ADD COLUMN IF NOT EXISTS step_id UUID REFERENCES public.pt_course_steps(id) ON DELETE CASCADE;

ALTER TABLE public.pt_course_progress
  DROP CONSTRAINT IF EXISTS pt_course_progress_enrollment_id_lesson_id_key;

DROP INDEX IF EXISTS pt_course_progress_enrollment_id_lesson_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pt_course_progress_enrollment_lesson
  ON public.pt_course_progress (enrollment_id, lesson_id)
  WHERE lesson_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pt_course_progress_enrollment_step
  ON public.pt_course_progress (enrollment_id, step_id)
  WHERE step_id IS NOT NULL;

ALTER TABLE public.pt_course_progress
  DROP CONSTRAINT IF EXISTS pt_course_progress_target_check;

ALTER TABLE public.pt_course_progress
  ADD CONSTRAINT pt_course_progress_target_check
  CHECK (
    (lesson_id IS NOT NULL AND step_id IS NULL)
    OR (lesson_id IS NULL AND step_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_pt_course_progress_step
  ON public.pt_course_progress (step_id)
  WHERE step_id IS NOT NULL;

-- -----------------------------------------------------
-- TRIGGERS: updated_at
-- -----------------------------------------------------

DROP TRIGGER IF EXISTS update_pt_course_steps_updated_at ON public.pt_course_steps;
CREATE TRIGGER update_pt_course_steps_updated_at
  BEFORE UPDATE ON public.pt_course_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pt_course_step_exercises_updated_at ON public.pt_course_step_exercises;
CREATE TRIGGER update_pt_course_step_exercises_updated_at
  BEFORE UPDATE ON public.pt_course_step_exercises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------
-- HELPERS
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_pt_course_step_owner(_step_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pt_course_steps s
    JOIN public.pt_courses c ON c.id = s.course_id
    WHERE s.id = _step_id AND c.pt_user_id = _user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_pt_course_step_owner(UUID, UUID) TO authenticated;

-- -----------------------------------------------------
-- RLS + GRANTS
-- -----------------------------------------------------

ALTER TABLE public.pt_course_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_course_step_exercises ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pt_course_steps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pt_course_step_exercises TO authenticated;

-- ===== pt_course_steps =====

DROP POLICY IF EXISTS "PT manages own course steps" ON public.pt_course_steps;
CREATE POLICY "PT manages own course steps"
  ON public.pt_course_steps FOR ALL TO authenticated
  USING (public.is_pt_course_owner(course_id, auth.uid()) AND public.is_pt(auth.uid()))
  WITH CHECK (public.is_pt_course_owner(course_id, auth.uid()) AND public.is_pt(auth.uid()));

DROP POLICY IF EXISTS "Everyone reads published course steps" ON public.pt_course_steps;
CREATE POLICY "Everyone reads published course steps"
  ON public.pt_course_steps FOR SELECT TO authenticated
  USING (public.is_pt_course_published(course_id));

DROP POLICY IF EXISTS "Admins can manage all pt course steps" ON public.pt_course_steps;
CREATE POLICY "Admins can manage all pt course steps"
  ON public.pt_course_steps FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ===== pt_course_step_exercises =====

DROP POLICY IF EXISTS "PT manages own course step exercises" ON public.pt_course_step_exercises;
CREATE POLICY "PT manages own course step exercises"
  ON public.pt_course_step_exercises FOR ALL TO authenticated
  USING (public.is_pt_course_step_owner(step_id, auth.uid()) AND public.is_pt(auth.uid()))
  WITH CHECK (public.is_pt_course_step_owner(step_id, auth.uid()) AND public.is_pt(auth.uid()));

DROP POLICY IF EXISTS "Everyone reads published course step exercises" ON public.pt_course_step_exercises;
CREATE POLICY "Everyone reads published course step exercises"
  ON public.pt_course_step_exercises FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.pt_course_steps s
      JOIN public.pt_courses c ON c.id = s.course_id
      WHERE s.id = pt_course_step_exercises.step_id
        AND c.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Admins can manage all pt course step exercises" ON public.pt_course_step_exercises;
CREATE POLICY "Admins can manage all pt course step exercises"
  ON public.pt_course_step_exercises FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
