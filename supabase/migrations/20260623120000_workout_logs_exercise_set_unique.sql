-- One log row per (workout_exercise_id, set_number) for upsert on re-log
DELETE FROM public.workout_logs wl
USING (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY workout_exercise_id, set_number
        ORDER BY logged_at DESC
      ) AS rn
    FROM public.workout_logs
  ) ranked
  WHERE ranked.rn > 1
) dupes
WHERE wl.id = dupes.id;

CREATE UNIQUE INDEX IF NOT EXISTS workout_logs_workout_exercise_set_unique
  ON public.workout_logs (workout_exercise_id, set_number);
