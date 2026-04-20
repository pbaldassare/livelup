-- Aggiungi modalità al programma (ricorrente vs day_by_day)
ALTER TABLE public.workout_programs
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'recurring' CHECK (mode IN ('recurring', 'day_by_day'));

-- Aggiungi day_offset agli schedules per modalità day_by_day
-- (offset in giorni dalla data di inizio assegnazione)
ALTER TABLE public.program_schedules
  ADD COLUMN IF NOT EXISTS day_offset INTEGER NULL;

-- Rendi day_of_week nullable per supportare il day_by_day mode
ALTER TABLE public.program_schedules
  ALTER COLUMN day_of_week DROP NOT NULL;

COMMENT ON COLUMN public.workout_programs.mode IS 'Modalità del programma: recurring (rotazione automatica) o day_by_day (giorni specifici)';
COMMENT ON COLUMN public.program_schedules.day_offset IS 'Offset in giorni dalla data di inizio assegnazione (solo per modalità day_by_day)';