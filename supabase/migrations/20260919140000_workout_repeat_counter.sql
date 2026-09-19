-- =====================================================
-- Ripetizioni sulla stessa assegnazione (non N copie)
-- repeat_target = volte da fare; repeat_done = volte registrate
-- =====================================================

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS repeat_target integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS repeat_done integer NOT NULL DEFAULT 0;

ALTER TABLE public.workouts
  DROP CONSTRAINT IF EXISTS workouts_repeat_target_check;
ALTER TABLE public.workouts
  ADD CONSTRAINT workouts_repeat_target_check
  CHECK (repeat_target >= 1 AND repeat_target <= 60);

ALTER TABLE public.workouts
  DROP CONSTRAINT IF EXISTS workouts_repeat_done_check;
ALTER TABLE public.workouts
  ADD CONSTRAINT workouts_repeat_done_check
  CHECK (repeat_done >= 0 AND repeat_done <= repeat_target);

COMMENT ON COLUMN public.workouts.repeat_target IS
  'Quante volte l''atleta deve svolgere questa stessa scheda. 1 = una volta.';
COMMENT ON COLUMN public.workouts.repeat_done IS
  'Quante volte la scheda è stata completata. Il ciclo chiude a repeat_done = repeat_target.';
