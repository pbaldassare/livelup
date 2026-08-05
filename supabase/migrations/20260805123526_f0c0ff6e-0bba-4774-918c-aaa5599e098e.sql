-- ===== 20260805120000_pt_course_enrollment_count_rls.sql =====
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

DROP POLICY IF EXISTS "PT views enrollments of own courses" ON public.pt_course_enrollments;
CREATE POLICY "PT views enrollments of own courses"
  ON public.pt_course_enrollments FOR SELECT TO authenticated
  USING (
    public.is_pt(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.pt_courses c
      WHERE c.id = pt_course_enrollments.course_id AND c.pt_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "PT assigns courses to connected athletes" ON public.pt_course_enrollments;
CREATE POLICY "PT assigns courses to connected athletes"
  ON public.pt_course_enrollments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_pt(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.pt_courses c
      WHERE c.id = pt_course_enrollments.course_id AND c.pt_user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.pt_atleta_connections c
      WHERE c.pt_user_id = auth.uid()
        AND c.atleta_user_id = pt_course_enrollments.atleta_user_id
        AND c.status = 'active'
    )
  );

DROP POLICY IF EXISTS "PT updates enrollments of own courses" ON public.pt_course_enrollments;
CREATE POLICY "PT updates enrollments of own courses"
  ON public.pt_course_enrollments FOR UPDATE TO authenticated
  USING (
    public.is_pt(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.pt_courses c
      WHERE c.id = pt_course_enrollments.course_id AND c.pt_user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_pt(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.pt_courses c
      WHERE c.id = pt_course_enrollments.course_id AND c.pt_user_id = auth.uid()
    )
  );

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

-- ===== 20260805150000_start_course_step_workout.sql =====
CREATE OR REPLACE FUNCTION public.start_course_step_workout(
  _enrollment_id uuid,
  _step_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _atleta uuid;
  _pt uuid;
  _course_id uuid;
  _step_title text;
  _step_type text;
  _workout_id uuid;
  _marker text;
  _progress_status text;
  ex record;
  _reps_min int;
  _reps_max int;
  _sets int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;

  SELECT e.atleta_user_id, c.pt_user_id, e.course_id
  INTO _atleta, _pt, _course_id
  FROM public.pt_course_enrollments e
  JOIN public.pt_courses c ON c.id = e.course_id
  WHERE e.id = _enrollment_id
    AND e.status = 'active';

  IF _atleta IS NULL THEN
    RAISE EXCEPTION 'Iscrizione non trovata';
  END IF;

  IF auth.uid() <> _atleta OR NOT public.is_atleta(auth.uid()) THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;

  SELECT s.title, COALESCE(s.step_type, 'exercises')
  INTO _step_title, _step_type
  FROM public.pt_course_steps s
  WHERE s.id = _step_id
    AND s.course_id = _course_id;

  IF _step_title IS NULL THEN
    RAISE EXCEPTION 'Step non trovato';
  END IF;

  IF _step_type <> 'exercises' THEN
    RAISE EXCEPTION 'Questo step non contiene esercizi';
  END IF;

  SELECT p.status
  INTO _progress_status
  FROM public.pt_course_step_progress p
  WHERE p.enrollment_id = _enrollment_id
    AND p.step_id = _step_id
    AND p.atleta_user_id = _atleta;

  IF _progress_status IS NULL OR _progress_status = 'locked' THEN
    RAISE EXCEPTION 'Questo step è ancora bloccato';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.pt_course_step_exercises se WHERE se.step_id = _step_id
  ) THEN
    RAISE EXCEPTION 'Nessun esercizio in questo step';
  END IF;

  _marker := 'course_step:' || _step_id::text;

  SELECT w.id
  INTO _workout_id
  FROM public.workouts w
  WHERE w.atleta_user_id = _atleta
    AND w.status = 'attivo'
    AND w.description = _marker
  ORDER BY w.created_at DESC
  LIMIT 1;

  IF _workout_id IS NOT NULL THEN
    RETURN _workout_id;
  END IF;

  INSERT INTO public.workouts (
    atleta_user_id, pt_user_id, title, description, status, template_kind, scheduled_date
  ) VALUES (
    _atleta, _pt, _step_title, _marker, 'attivo', 'libera', CURRENT_DATE
  )
  RETURNING id INTO _workout_id;

  FOR ex IN
    SELECT se.* FROM public.pt_course_step_exercises se
    WHERE se.step_id = _step_id
    ORDER BY se.order_index
  LOOP
    _reps_min := COALESCE(
      NULLIF(regexp_replace(split_part(COALESCE(ex.reps, '10'), '-', 1), '[^0-9]', '', 'g'), '')::int,
      10
    );

    IF COALESCE(ex.reps, '') ~ '-' THEN
      _reps_max := NULLIF(regexp_replace(split_part(ex.reps, '-', 2), '[^0-9]', '', 'g'), '')::int;
    ELSE
      _reps_max := NULL;
    END IF;

    _sets := COALESCE(ex.sets, 3);

    INSERT INTO public.workout_exercises (
      workout_id, exercise_id, order_index, prescribed_sets,
      prescribed_reps_min, prescribed_reps_max, rest_seconds, notes
    ) VALUES (
      _workout_id, ex.exercise_id, ex.order_index, _sets,
      _reps_min, _reps_max, COALESCE(ex.rest_seconds, 60), ex.notes
    );
  END LOOP;

  RETURN _workout_id;
END;
$$;

COMMENT ON FUNCTION public.start_course_step_workout(uuid, uuid) IS
  'Crea o riprende un workout attivo dagli esercizi di uno step corso per l''atleta iscritto.';

GRANT EXECUTE ON FUNCTION public.start_course_step_workout(uuid, uuid) TO authenticated;

-- ===== 20260805180000_multi_pt_connections.sql =====
ALTER TABLE public.pt_atleta_connections
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.pt_atleta_connections.is_primary IS
  'Coach primario scelto dall''atleta. Al più uno true tra le connessioni active.';

DROP TRIGGER IF EXISTS trigger_enforce_single_pt ON public.pt_atleta_connections;
DROP FUNCTION IF EXISTS public.enforce_single_pt_connection();

CREATE UNIQUE INDEX IF NOT EXISTS idx_pt_atleta_one_primary_per_athlete
  ON public.pt_atleta_connections (atleta_user_id)
  WHERE (status = 'active' AND is_primary = true);

CREATE INDEX IF NOT EXISTS idx_pt_atleta_connections_athlete_active
  ON public.pt_atleta_connections (atleta_user_id, status)
  WHERE status = 'active';

UPDATE public.pt_atleta_connections c
SET is_primary = true
WHERE c.status = 'active'
  AND c.is_primary = false
  AND c.id = (
    SELECT c2.id FROM public.pt_atleta_connections c2
    WHERE c2.atleta_user_id = c.atleta_user_id AND c2.status = 'active'
    ORDER BY c2.accepted_at NULLS LAST, c2.created_at ASC
    LIMIT 1
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.pt_atleta_connections c3
    WHERE c3.atleta_user_id = c.atleta_user_id
      AND c3.status = 'active'
      AND c3.is_primary = true
  );

CREATE OR REPLACE FUNCTION public.can_atleta_connect_to_pt(_atleta_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT true;
$$;

COMMENT ON FUNCTION public.can_atleta_connect_to_pt(uuid) IS
  'Legacy: multi-PT abilitato. Usare can_atleta_connect_to_specific_pt per il check per-PT.';

CREATE OR REPLACE FUNCTION public.can_atleta_connect_to_specific_pt(
  _atleta_user_id uuid,
  _pt_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.pt_atleta_connections
    WHERE atleta_user_id = _atleta_user_id
      AND pt_user_id = _pt_user_id
      AND status IN ('active', 'pending')
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_atleta_connect_to_specific_pt(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_atleta_current_pt(_atleta_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pt_user_id
  FROM public.pt_atleta_connections
  WHERE atleta_user_id = _atleta_user_id
    AND status = 'active'
  ORDER BY is_primary DESC, accepted_at NULLS LAST, created_at ASC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_atleta_active_pts(_atleta_user_id uuid)
RETURNS TABLE (
  connection_id uuid,
  pt_user_id uuid,
  is_primary boolean,
  is_pt_active boolean,
  accepted_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id AS connection_id,
    c.pt_user_id,
    c.is_primary,
    COALESCE(c.is_pt_active, true) AS is_pt_active,
    c.accepted_at
  FROM public.pt_atleta_connections c
  WHERE c.atleta_user_id = _atleta_user_id
    AND c.status = 'active'
  ORDER BY c.is_primary DESC, c.accepted_at NULLS LAST, c.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_atleta_active_pts(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_primary_on_activate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' AND COALESCE(NEW.is_primary, false) = false THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.pt_atleta_connections
      WHERE atleta_user_id = NEW.atleta_user_id
        AND status = 'active'
        AND is_primary = true
        AND id IS DISTINCT FROM NEW.id
    ) THEN
      NEW.is_primary := true;
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM 'active' THEN
    NEW.is_primary := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_ensure_primary_on_activate ON public.pt_atleta_connections;
CREATE TRIGGER trigger_ensure_primary_on_activate
  BEFORE INSERT OR UPDATE OF status
  ON public.pt_atleta_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_primary_on_activate();

CREATE OR REPLACE FUNCTION public.promote_primary_after_terminate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'active'
     AND NEW.status = 'terminated'
     AND COALESCE(OLD.is_primary, false) = true
  THEN
    UPDATE public.pt_atleta_connections
    SET is_primary = true, updated_at = now()
    WHERE id = (
      SELECT c.id FROM public.pt_atleta_connections c
      WHERE c.atleta_user_id = NEW.atleta_user_id AND c.status = 'active'
      ORDER BY c.accepted_at NULLS LAST, c.created_at ASC
      LIMIT 1
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_promote_primary_after_terminate ON public.pt_atleta_connections;
CREATE TRIGGER trigger_promote_primary_after_terminate
  AFTER UPDATE OF status
  ON public.pt_atleta_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.promote_primary_after_terminate();

CREATE OR REPLACE FUNCTION public.set_atleta_primary_pt(_pt_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _atleta uuid := auth.uid();
  _conn_id uuid;
BEGIN
  IF _atleta IS NULL OR NOT public.is_atleta(_atleta) THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;

  SELECT id INTO _conn_id
  FROM public.pt_atleta_connections
  WHERE atleta_user_id = _atleta
    AND pt_user_id = _pt_user_id
    AND status = 'active';

  IF _conn_id IS NULL THEN
    RAISE EXCEPTION 'Connessione attiva non trovata con questo Professionista';
  END IF;

  UPDATE public.pt_atleta_connections
  SET is_primary = false, updated_at = now()
  WHERE atleta_user_id = _atleta
    AND status = 'active'
    AND is_primary = true
    AND id IS DISTINCT FROM _conn_id;

  UPDATE public.pt_atleta_connections
  SET is_primary = true, updated_at = now()
  WHERE id = _conn_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_atleta_primary_pt(uuid) TO authenticated;

COMMENT ON FUNCTION public.set_atleta_primary_pt(uuid) IS
  'L''atleta sceglie il coach primario tra le connessioni active.';