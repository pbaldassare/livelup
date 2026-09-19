-- =====================================================
-- RPC per il contatore N volte (bypassa la cache API colonne)
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_workout_repeat_target(
  _workout_id uuid,
  _repeat_target integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;

  t := GREATEST(1, LEAST(60, COALESCE(_repeat_target, 1)));

  UPDATE public.workouts w
  SET
    repeat_target = t,
    repeat_done = 0
  WHERE w.id = _workout_id
    AND (
      w.pt_user_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Non autorizzato a impostare le ripetizioni di questa scheda';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_workout_repeat_completion(
  _workout_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w public.workouts%ROWTYPE;
  new_done integer;
  finished boolean;
  new_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;

  SELECT * INTO w
  FROM public.workouts
  WHERE id = _workout_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Allenamento non trovato';
  END IF;

  IF w.atleta_user_id <> auth.uid()
     AND w.pt_user_id <> auth.uid()
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Non autorizzato a completare questa scheda';
  END IF;

  IF w.status = 'completato' THEN
    RETURN jsonb_build_object(
      'repeat_done', COALESCE(w.repeat_done, 0),
      'repeat_target', COALESCE(w.repeat_target, 1),
      'finished', true,
      'status', w.status
    );
  END IF;

  new_done := LEAST(COALESCE(w.repeat_target, 1), COALESCE(w.repeat_done, 0) + 1);
  finished := new_done >= COALESCE(w.repeat_target, 1);
  new_status := CASE WHEN finished THEN 'completato' ELSE 'in_corso' END;

  IF NOT finished THEN
    DELETE FROM public.workout_logs
    WHERE workout_exercise_id IN (
      SELECT we.id FROM public.workout_exercises we WHERE we.workout_id = _workout_id
    );
  END IF;

  UPDATE public.workouts
  SET
    repeat_done = new_done,
    status = new_status::public.workout_status,
    completed_at = CASE WHEN finished THEN now() ELSE NULL END
  WHERE id = _workout_id;

  RETURN jsonb_build_object(
    'repeat_done', new_done,
    'repeat_target', COALESCE(w.repeat_target, 1),
    'finished', finished,
    'status', new_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_workout_repeat_target(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_workout_repeat_completion(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_workout_repeat_target(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_workout_repeat_completion(uuid) TO authenticated;

COMMENT ON FUNCTION public.set_workout_repeat_target(uuid, integer) IS
  'Imposta quante volte ripetere la stessa scheda. Chiamata dal PT dopo createWorkout.';
COMMENT ON FUNCTION public.apply_workout_repeat_completion(uuid) IS
  'Incrementa repeat_done, azzera i log a metà ciclo, chiude a completato sull''ultima volta.';
