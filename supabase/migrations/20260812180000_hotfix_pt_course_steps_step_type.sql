-- =====================================================
-- Hotfix: Avvia corso atleta
-- Cloud manca pt_course_steps.step_type → RPC fallisce con
-- "column s.step_type does not exist"
-- =====================================================

ALTER TABLE public.pt_course_steps
  ADD COLUMN IF NOT EXISTS step_type TEXT;

UPDATE public.pt_course_steps
SET step_type = 'exercises'
WHERE step_type IS NULL
   OR step_type NOT IN ('exercises', 'video');

ALTER TABLE public.pt_course_steps
  ALTER COLUMN step_type SET DEFAULT 'exercises';

ALTER TABLE public.pt_course_steps
  ALTER COLUMN step_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pt_course_steps_step_type_check'
  ) THEN
    ALTER TABLE public.pt_course_steps
      ADD CONSTRAINT pt_course_steps_step_type_check
      CHECK (step_type IN ('exercises', 'video'));
  END IF;
END $$;

ALTER TABLE public.pt_course_steps
  ADD COLUMN IF NOT EXISTS video_url TEXT;

ALTER TABLE public.pt_course_steps
  ADD COLUMN IF NOT EXISTS video_duration_minutes INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pt_course_steps_video_duration_minutes_check'
  ) THEN
    ALTER TABLE public.pt_course_steps
      ADD CONSTRAINT pt_course_steps_video_duration_minutes_check
      CHECK (video_duration_minutes IS NULL OR video_duration_minutes > 0);
  END IF;
END $$;

COMMENT ON COLUMN public.pt_course_steps.step_type IS
  'Tipo step: exercises (lista esercizi) o video (contenuto video).';

-- Ricrea RPC (usa step_type dopo backfill)
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
    SELECT 1
    FROM public.pt_course_step_exercises se
    WHERE se.step_id = _step_id
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
    atleta_user_id,
    pt_user_id,
    title,
    description,
    status,
    template_kind,
    scheduled_date
  ) VALUES (
    _atleta,
    _pt,
    _step_title,
    _marker,
    'attivo',
    'libera',
    CURRENT_DATE
  )
  RETURNING id INTO _workout_id;

  FOR ex IN
    SELECT se.*
    FROM public.pt_course_step_exercises se
    WHERE se.step_id = _step_id
    ORDER BY se.order_index
  LOOP
    _reps_min := COALESCE(
      NULLIF(
        regexp_replace(split_part(COALESCE(ex.reps, '10'), '-', 1), '[^0-9]', '', 'g'),
        ''
      )::int,
      10
    );

    IF COALESCE(ex.reps, '') ~ '-' THEN
      _reps_max := NULLIF(
        regexp_replace(split_part(ex.reps, '-', 2), '[^0-9]', '', 'g'),
        ''
      )::int;
    ELSE
      _reps_max := NULL;
    END IF;

    _sets := COALESCE(ex.sets, 3);

    INSERT INTO public.workout_exercises (
      workout_id,
      exercise_id,
      order_index,
      prescribed_sets,
      prescribed_reps_min,
      prescribed_reps_max,
      rest_seconds,
      notes
    ) VALUES (
      _workout_id,
      ex.exercise_id,
      ex.order_index,
      _sets,
      _reps_min,
      _reps_max,
      COALESCE(ex.rest_seconds, 60),
      ex.notes
    );
  END LOOP;

  RETURN _workout_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_course_step_workout(uuid, uuid) TO authenticated;
