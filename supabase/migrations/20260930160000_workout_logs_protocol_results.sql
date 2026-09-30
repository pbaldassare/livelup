-- Ripetizioni/secondi fatti davvero per ogni esercizio dentro un protocollo
-- (SUPERSET / EMOM / AMRAP / HIIT / TABATA). Una riga workout_logs per blocco,
-- dettaglio per round × esercizio in protocol_results.
ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS protocol_results jsonb;

COMMENT ON COLUMN public.workout_logs.protocol_results IS
  '{version, protocol, rounds_completed?, entries:[{round, exercise_index, exercise_id, name, mode, target, done}]}';

-- La firma cambia: la vecchia va eliminata, altrimenti le chiamate con argomenti nominati diventano ambigue.
DROP FUNCTION IF EXISTS public.pt_save_workout_log(uuid, integer, integer, numeric, integer, integer, text);

CREATE OR REPLACE FUNCTION public.pt_save_workout_log(
  _workout_exercise_id uuid,
  _set_number integer,
  _reps_completed integer DEFAULT NULL::integer,
  _weight_used numeric DEFAULT NULL::numeric,
  _duration_seconds integer DEFAULT NULL::integer,
  _rpe integer DEFAULT NULL::integer,
  _notes text DEFAULT NULL::text,
  _protocol_results jsonb DEFAULT NULL::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _atleta uuid;
  _pt uuid;
  _new_id uuid;
BEGIN
  SELECT w.atleta_user_id, w.pt_user_id
  INTO _atleta, _pt
  FROM public.workout_exercises we
  JOIN public.workouts w ON w.id = we.workout_id
  WHERE we.id = _workout_exercise_id;

  IF _atleta IS NULL THEN
    RAISE EXCEPTION 'Workout exercise not found';
  END IF;

  IF auth.uid() <> _pt THEN
    RAISE EXCEPTION 'Not authorized: caller is not the PT of this workout';
  END IF;

  IF NOT public.is_pt(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized: caller is not a PT';
  END IF;

  IF NOT public.are_connected(auth.uid(), _atleta) THEN
    RAISE EXCEPTION 'Not authorized: PT is not connected to this athlete';
  END IF;

  DELETE FROM public.workout_logs
  WHERE workout_exercise_id = _workout_exercise_id
    AND set_number = _set_number;

  INSERT INTO public.workout_logs (
    workout_exercise_id, set_number, reps_completed, weight_used,
    duration_seconds, rpe, notes, is_completed, protocol_results
  ) VALUES (
    _workout_exercise_id, _set_number, _reps_completed, _weight_used,
    _duration_seconds, _rpe, _notes, true, _protocol_results
  )
  RETURNING id INTO _new_id;

  RETURN _new_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.pt_save_workout_log(uuid, integer, integer, numeric, integer, integer, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pt_save_workout_log(uuid, integer, integer, numeric, integer, integer, text, jsonb) TO authenticated;
