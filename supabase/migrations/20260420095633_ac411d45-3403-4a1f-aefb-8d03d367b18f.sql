
-- Aggiunge supporto per esercizi a tempo (durata) come parametro prescritto
ALTER TABLE public.template_exercises
  ADD COLUMN IF NOT EXISTS prescribed_duration_seconds INTEGER;

ALTER TABLE public.workout_exercises
  ADD COLUMN IF NOT EXISTS prescribed_duration_seconds INTEGER;

COMMENT ON COLUMN public.template_exercises.prescribed_duration_seconds IS 'Durata in secondi per esercizi a tempo (alternativo a reps_min/reps_max).';
COMMENT ON COLUMN public.workout_exercises.prescribed_duration_seconds IS 'Durata in secondi per esercizi a tempo (alternativo a prescribed_reps_min/max).';
