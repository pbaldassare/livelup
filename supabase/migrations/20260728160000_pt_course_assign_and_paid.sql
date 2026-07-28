-- =====================================================
-- PT può assegnare corsi agli atleti collegati
-- Flag pagamento già su pt_courses (is_free, price)
-- =====================================================

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

COMMENT ON COLUMN public.pt_course_enrollments.assigned_by IS
  'self = iscrizione atleta; pt = assegnato dal coach';

-- PT inserisce iscrizioni sui propri corsi per atleti con connessione active
DROP POLICY IF EXISTS "PT assigns courses to connected athletes" ON public.pt_course_enrollments;
CREATE POLICY "PT assigns courses to connected athletes"
  ON public.pt_course_enrollments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_pt(auth.uid())
    AND public.is_pt_course_owner(course_id, auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.pt_atleta_connections c
      WHERE c.pt_user_id = auth.uid()
        AND c.atleta_user_id = pt_course_enrollments.atleta_user_id
        AND c.status = 'active'
    )
  );

-- PT può aggiornare iscrizioni dei propri corsi (es. riattivare)
DROP POLICY IF EXISTS "PT updates enrollments of own courses" ON public.pt_course_enrollments;
CREATE POLICY "PT updates enrollments of own courses"
  ON public.pt_course_enrollments FOR UPDATE TO authenticated
  USING (public.is_pt_course_owner(course_id, auth.uid()) AND public.is_pt(auth.uid()))
  WITH CHECK (public.is_pt_course_owner(course_id, auth.uid()) AND public.is_pt(auth.uid()));

-- PT può creare progress step quando assegna
DROP POLICY IF EXISTS "PT inserts step progress when assigning" ON public.pt_course_step_progress;
CREATE POLICY "PT inserts step progress when assigning"
  ON public.pt_course_step_progress FOR INSERT TO authenticated
  WITH CHECK (
    public.is_pt(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.pt_course_enrollments e
      JOIN public.pt_courses c ON c.id = e.course_id
      WHERE e.id = pt_course_step_progress.enrollment_id
        AND c.pt_user_id = auth.uid()
        AND e.atleta_user_id = pt_course_step_progress.atleta_user_id
    )
  );

DROP POLICY IF EXISTS "PT deletes step progress of own courses" ON public.pt_course_step_progress;
CREATE POLICY "PT deletes step progress of own courses"
  ON public.pt_course_step_progress FOR DELETE TO authenticated
  USING (
    public.is_pt(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.pt_course_enrollments e
      JOIN public.pt_courses c ON c.id = e.course_id
      WHERE e.id = pt_course_step_progress.enrollment_id
        AND c.pt_user_id = auth.uid()
    )
  );
