-- Riepilogo sessione allenamento (visibile PT + atleta)
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS duration_seconds integer;

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS sets_completed integer;

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS reps_total integer;

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS volume_kg numeric;

COMMENT ON COLUMN public.workouts.duration_seconds IS 'Durata sessione in secondi (timer client al complete)';
COMMENT ON COLUMN public.workouts.sets_completed IS 'Set completati (snapshot a fine allenamento)';
COMMENT ON COLUMN public.workouts.reps_total IS 'Reps totali (snapshot a fine allenamento)';
COMMENT ON COLUMN public.workouts.volume_kg IS 'Volume totale kg = Σ(reps × peso) (snapshot)';
