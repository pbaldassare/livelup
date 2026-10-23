-- L'atleta vede gli esercizi (anche privati del PT o da catalogo) presenti nei suoi workout:
-- senza questo, nome/video/istruzioni arrivano null e la UI mostra "Esercizio".
CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise ON public.workout_exercises (exercise_id);

CREATE OR REPLACE FUNCTION public.athlete_has_exercise_in_workouts(_exercise_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workout_exercises we
    JOIN public.workouts w ON w.id = we.workout_id
    WHERE we.exercise_id = _exercise_id
      AND w.atleta_user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.athlete_has_exercise_in_workouts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.athlete_has_exercise_in_workouts(uuid) TO authenticated;

DROP POLICY IF EXISTS "Athletes can view exercises in their workouts" ON public.exercises;
CREATE POLICY "Athletes can view exercises in their workouts"
  ON public.exercises
  FOR SELECT
  TO authenticated
  USING (public.athlete_has_exercise_in_workouts(id));
