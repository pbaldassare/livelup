
-- RPC: allow PT to save a workout log on behalf of a connected athlete.
-- Uses SECURITY DEFINER so it can bypass the athlete-only RLS on workout_logs,
-- after verifying the caller is the PT linked to that workout AND actively connected to the athlete.

CREATE OR REPLACE FUNCTION public.pt_save_workout_log(
  _workout_exercise_id uuid,
  _set_number integer,
  _reps_completed integer DEFAULT NULL,
  _weight_used numeric DEFAULT NULL,
  _duration_seconds integer DEFAULT NULL,
  _rpe integer DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _atleta uuid;
  _pt uuid;
  _new_id uuid;
BEGIN
  -- Resolve owning workout
  SELECT w.atleta_user_id, w.pt_user_id
  INTO _atleta, _pt
  FROM public.workout_exercises we
  JOIN public.workouts w ON w.id = we.workout_id
  WHERE we.id = _workout_exercise_id;

  IF _atleta IS NULL THEN
    RAISE EXCEPTION 'Workout exercise not found';
  END IF;

  -- Caller must be the PT of this workout AND actively connected to the athlete
  IF auth.uid() <> _pt THEN
    RAISE EXCEPTION 'Not authorized: caller is not the PT of this workout';
  END IF;

  IF NOT public.is_pt(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized: caller is not a PT';
  END IF;

  IF NOT public.are_connected(auth.uid(), _atleta) THEN
    RAISE EXCEPTION 'Not authorized: PT is not connected to this athlete';
  END IF;

  -- Replace any existing log for that set (mirrors athlete flow)
  DELETE FROM public.workout_logs
  WHERE workout_exercise_id = _workout_exercise_id
    AND set_number = _set_number;

  INSERT INTO public.workout_logs (
    workout_exercise_id, set_number, reps_completed, weight_used,
    duration_seconds, rpe, notes, is_completed
  ) VALUES (
    _workout_exercise_id, _set_number, _reps_completed, _weight_used,
    _duration_seconds, _rpe, _notes, true
  )
  RETURNING id INTO _new_id;

  RETURN _new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pt_save_workout_log(uuid, integer, integer, numeric, integer, integer, text) TO authenticated;
