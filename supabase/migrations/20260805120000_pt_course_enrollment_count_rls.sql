-- =====================================================
-- PT Courses — enrollment visibility / count reliability
-- Ensures PT can SELECT enrollments on own courses (for
-- list counts + Assign dialog) and re-asserts assign RLS.
-- =====================================================

-- assigned_by may already exist (20260728160000); keep idempotent
ALTER TABLE public.pt_course_enrollments
  ADD COLUMN IF NOT EXISTS assigned_by text NOT NULL DEFAULT 'self';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pt_course_enrollments_assigned_by_check'
  ) THEN
    ALTER TABLE public.pt_course_enrollments
      ADD CONSTRAINT pt_course_enrollments_assigned_by_check
      CHECK (assigned_by IN ('self', 'pt'));
  END IF;
END $$;

-- PT legge iscrizioni dei propri corsi (conteggio card + dialog Assegna)
DROP POLICY IF EXISTS "PT views enrollments of own courses" ON public.pt_course_enrollments;
CREATE POLICY "PT views enrollments of own courses"
  ON public.pt_course_enrollments FOR SELECT TO authenticated
  USING (
    public.is_pt(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.pt_courses c
      WHERE c.id = pt_course_enrollments.course_id
        AND c.pt_user_id = auth.uid()
    )
  );

-- PT assegna corsi ad atleti collegati
DROP POLICY IF EXISTS "PT assigns courses to connected athletes" ON public.pt_course_enrollments;
CREATE POLICY "PT assigns courses to connected athletes"
  ON public.pt_course_enrollments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_pt(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.pt_courses c
      WHERE c.id = pt_course_enrollments.course_id
        AND c.pt_user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.pt_atleta_connections c
      WHERE c.pt_user_id = auth.uid()
        AND c.atleta_user_id = pt_course_enrollments.atleta_user_id
        AND c.status = 'active'
    )
  );

-- PT aggiorna iscrizioni dei propri corsi
DROP POLICY IF EXISTS "PT updates enrollments of own courses" ON public.pt_course_enrollments;
CREATE POLICY "PT updates enrollments of own courses"
  ON public.pt_course_enrollments FOR UPDATE TO authenticated
  USING (
    public.is_pt(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.pt_courses c
      WHERE c.id = pt_course_enrollments.course_id
        AND c.pt_user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_pt(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.pt_courses c
      WHERE c.id = pt_course_enrollments.course_id
        AND c.pt_user_id = auth.uid()
    )
  );

-- Helper conteggio iscritti (bypass RLS interno, scoped al PT owner)
CREATE OR REPLACE FUNCTION public.count_pt_course_enrollments(_course_ids uuid[])
RETURNS TABLE(course_id uuid, enrolled_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.course_id, count(*)::bigint AS enrolled_count
  FROM public.pt_course_enrollments e
  JOIN public.pt_courses c ON c.id = e.course_id
  WHERE e.course_id = ANY(_course_ids)
    AND e.status <> 'cancelled'
    AND c.pt_user_id = auth.uid()
  GROUP BY e.course_id;
$$;

COMMENT ON FUNCTION public.count_pt_course_enrollments(uuid[]) IS
  'Conteggio iscrizioni non-cancelled per i corsi del PT autenticato.';

GRANT EXECUTE ON FUNCTION public.count_pt_course_enrollments(uuid[]) TO authenticated;
