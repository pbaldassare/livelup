-- PT Courses System (corsi gestiti dal PT)
-- Copia su Lovable Cloud SQL editor se la migration non è ancora applicata.
-- (contenuto identico a supabase/migrations/20260728130000_pt_courses_system.sql)
-- Tabelle: pt_courses, pt_course_modules, pt_course_lessons,
--          pt_course_enrollments, pt_course_progress
-- =====================================================

-- -----------------------------------------------------
-- 1) pt_courses — catalogo corso PT
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pt_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  category TEXT,
  difficulty_level TEXT DEFAULT 'beginner'
    CHECK (difficulty_level IS NULL OR difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  duration_minutes INTEGER,
  price NUMERIC NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pt_courses IS
  'Catalogo corsi di proprietà del PT (non confondere con admin public.courses).';

CREATE INDEX IF NOT EXISTS idx_pt_courses_pt_user
  ON public.pt_courses (pt_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pt_courses_status
  ON public.pt_courses (status)
  WHERE status = 'published';

-- -----------------------------------------------------
-- 2) pt_course_modules — sezioni/moduli del corso
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pt_course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.pt_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pt_course_modules_course
  ON public.pt_course_modules (course_id, order_index);

-- -----------------------------------------------------
-- 3) pt_course_lessons — lezioni / contenuti
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pt_course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.pt_course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  video_url TEXT,
  duration_minutes INTEGER,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_preview BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pt_course_lessons_module
  ON public.pt_course_lessons (module_id, order_index);

-- -----------------------------------------------------
-- 4) pt_course_enrollments — iscrizione atleta
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pt_course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.pt_courses(id) ON DELETE CASCADE,
  atleta_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'cancelled')),
  progress_pct INTEGER NOT NULL DEFAULT 0
    CHECK (progress_pct >= 0 AND progress_pct <= 100),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (course_id, atleta_user_id)
);

CREATE INDEX IF NOT EXISTS idx_pt_course_enrollments_athlete
  ON public.pt_course_enrollments (atleta_user_id, enrolled_at DESC);

CREATE INDEX IF NOT EXISTS idx_pt_course_enrollments_course
  ON public.pt_course_enrollments (course_id);

-- -----------------------------------------------------
-- 5) pt_course_progress — completamento lezione
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pt_course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.pt_course_enrollments(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.pt_course_lessons(id) ON DELETE CASCADE,
  atleta_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  watch_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_pt_course_progress_athlete
  ON public.pt_course_progress (atleta_user_id);

CREATE INDEX IF NOT EXISTS idx_pt_course_progress_enrollment
  ON public.pt_course_progress (enrollment_id);

-- -----------------------------------------------------
-- TRIGGERS: updated_at
-- -----------------------------------------------------

DROP TRIGGER IF EXISTS update_pt_courses_updated_at ON public.pt_courses;
CREATE TRIGGER update_pt_courses_updated_at
  BEFORE UPDATE ON public.pt_courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pt_course_modules_updated_at ON public.pt_course_modules;
CREATE TRIGGER update_pt_course_modules_updated_at
  BEFORE UPDATE ON public.pt_course_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pt_course_lessons_updated_at ON public.pt_course_lessons;
CREATE TRIGGER update_pt_course_lessons_updated_at
  BEFORE UPDATE ON public.pt_course_lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pt_course_progress_updated_at ON public.pt_course_progress;
CREATE TRIGGER update_pt_course_progress_updated_at
  BEFORE UPDATE ON public.pt_course_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------
-- HELPERS (SECURITY DEFINER) — ownership / published
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_pt_course_owner(_course_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pt_courses c
    WHERE c.id = _course_id AND c.pt_user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_pt_course_published(_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pt_courses c
    WHERE c.id = _course_id AND c.status = 'published'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_pt_course_module_owner(_module_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pt_course_modules m
    JOIN public.pt_courses c ON c.id = m.course_id
    WHERE m.id = _module_id AND c.pt_user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_pt_course_lesson_owner(_lesson_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pt_course_lessons l
    JOIN public.pt_course_modules m ON m.id = l.module_id
    JOIN public.pt_courses c ON c.id = m.course_id
    WHERE l.id = _lesson_id AND c.pt_user_id = _user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_pt_course_owner(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_pt_course_published(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_pt_course_module_owner(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_pt_course_lesson_owner(UUID, UUID) TO authenticated;

-- -----------------------------------------------------
-- RLS + GRANTS
-- -----------------------------------------------------

ALTER TABLE public.pt_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_course_progress ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pt_courses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pt_course_modules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pt_course_lessons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pt_course_enrollments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pt_course_progress TO authenticated;

-- ===== pt_courses =====

DROP POLICY IF EXISTS "PT manages own courses" ON public.pt_courses;
CREATE POLICY "PT manages own courses"
  ON public.pt_courses FOR ALL TO authenticated
  USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()))
  WITH CHECK (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

DROP POLICY IF EXISTS "Everyone reads published courses" ON public.pt_courses;
CREATE POLICY "Everyone reads published courses"
  ON public.pt_courses FOR SELECT TO authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "Admins can manage all pt courses" ON public.pt_courses;
CREATE POLICY "Admins can manage all pt courses"
  ON public.pt_courses FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ===== pt_course_modules =====

DROP POLICY IF EXISTS "PT manages own course modules" ON public.pt_course_modules;
CREATE POLICY "PT manages own course modules"
  ON public.pt_course_modules FOR ALL TO authenticated
  USING (public.is_pt_course_owner(course_id, auth.uid()) AND public.is_pt(auth.uid()))
  WITH CHECK (public.is_pt_course_owner(course_id, auth.uid()) AND public.is_pt(auth.uid()));

DROP POLICY IF EXISTS "Everyone reads published course modules" ON public.pt_course_modules;
CREATE POLICY "Everyone reads published course modules"
  ON public.pt_course_modules FOR SELECT TO authenticated
  USING (public.is_pt_course_published(course_id));

DROP POLICY IF EXISTS "Admins can manage all pt course modules" ON public.pt_course_modules;
CREATE POLICY "Admins can manage all pt course modules"
  ON public.pt_course_modules FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ===== pt_course_lessons =====

DROP POLICY IF EXISTS "PT manages own course lessons" ON public.pt_course_lessons;
CREATE POLICY "PT manages own course lessons"
  ON public.pt_course_lessons FOR ALL TO authenticated
  USING (public.is_pt_course_module_owner(module_id, auth.uid()) AND public.is_pt(auth.uid()))
  WITH CHECK (public.is_pt_course_module_owner(module_id, auth.uid()) AND public.is_pt(auth.uid()));

DROP POLICY IF EXISTS "Everyone reads published course lessons" ON public.pt_course_lessons;
CREATE POLICY "Everyone reads published course lessons"
  ON public.pt_course_lessons FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.pt_course_modules m
      JOIN public.pt_courses c ON c.id = m.course_id
      WHERE m.id = pt_course_lessons.module_id
        AND c.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Admins can manage all pt course lessons" ON public.pt_course_lessons;
CREATE POLICY "Admins can manage all pt course lessons"
  ON public.pt_course_lessons FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ===== pt_course_enrollments =====

DROP POLICY IF EXISTS "Athlete manages own course enrollments" ON public.pt_course_enrollments;
CREATE POLICY "Athlete manages own course enrollments"
  ON public.pt_course_enrollments FOR ALL TO authenticated
  USING (auth.uid() = atleta_user_id)
  WITH CHECK (auth.uid() = atleta_user_id);

DROP POLICY IF EXISTS "PT views enrollments of own courses" ON public.pt_course_enrollments;
CREATE POLICY "PT views enrollments of own courses"
  ON public.pt_course_enrollments FOR SELECT TO authenticated
  USING (public.is_pt_course_owner(course_id, auth.uid()) AND public.is_pt(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all pt course enrollments" ON public.pt_course_enrollments;
CREATE POLICY "Admins can manage all pt course enrollments"
  ON public.pt_course_enrollments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ===== pt_course_progress =====

DROP POLICY IF EXISTS "Athlete manages own course progress" ON public.pt_course_progress;
CREATE POLICY "Athlete manages own course progress"
  ON public.pt_course_progress FOR ALL TO authenticated
  USING (auth.uid() = atleta_user_id)
  WITH CHECK (auth.uid() = atleta_user_id);

DROP POLICY IF EXISTS "PT views progress of own courses" ON public.pt_course_progress;
CREATE POLICY "PT views progress of own courses"
  ON public.pt_course_progress FOR SELECT TO authenticated
  USING (
    public.is_pt(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.pt_course_enrollments e
      WHERE e.id = pt_course_progress.enrollment_id
        AND public.is_pt_course_owner(e.course_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage all pt course progress" ON public.pt_course_progress;
CREATE POLICY "Admins can manage all pt course progress"
  ON public.pt_course_progress FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
