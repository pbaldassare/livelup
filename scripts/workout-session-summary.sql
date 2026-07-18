-- Riepilogo sessione su workouts (PT + atleta)
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS duration_seconds integer;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS sets_completed integer;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS reps_total integer;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS volume_kg numeric;
