
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS athlete_reordered_at TIMESTAMPTZ NULL;

-- Update RPC to set the flag when the athlete reorders (only for 'libera')
CREATE OR REPLACE FUNCTION public.atleta_reorder_workout_exercises(_workout_id uuid, _ordered_exercise_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _atleta UUID;
  _uid UUID := auth.uid();
  _kind TEXT;
  _i INT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT atleta_user_id, template_kind INTO _atleta, _kind
  FROM public.workouts WHERE id = _workout_id;
  IF _atleta IS NULL THEN RAISE EXCEPTION 'Workout not found'; END IF;
  IF _atleta <> _uid THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF COALESCE(_kind, 'libera') <> 'libera' THEN
    RAISE EXCEPTION 'Riordino consentito solo per schede libere';
  END IF;

  FOR _i IN 1..array_length(_ordered_exercise_ids, 1) LOOP
    UPDATE public.workout_exercises
      SET order_index = _i - 1
      WHERE id = _ordered_exercise_ids[_i]
        AND workout_id = _workout_id;
  END LOOP;

  UPDATE public.workouts SET athlete_reordered_at = now(), updated_at = now() WHERE id = _workout_id;
END;
$function$;
