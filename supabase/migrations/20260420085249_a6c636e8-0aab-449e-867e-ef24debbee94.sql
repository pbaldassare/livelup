-- Aggiungi colonne per rotazione continua delle schede nel programma
ALTER TABLE public.program_assignments
  ADD COLUMN IF NOT EXISTS current_index INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_days INTEGER[] NOT NULL DEFAULT '{1,3,5}'::INTEGER[];

-- Aggiungi giorni attivi anche al programma (default per nuove assegnazioni)
ALTER TABLE public.workout_programs
  ADD COLUMN IF NOT EXISTS active_days INTEGER[] NOT NULL DEFAULT '{1,3,5}'::INTEGER[];

COMMENT ON COLUMN public.program_assignments.current_index IS 'Indice della prossima scheda da assegnare nella rotazione ciclica (modulo numero schede)';
COMMENT ON COLUMN public.program_assignments.active_days IS 'Giorni della settimana attivi per questa assegnazione (1=Lun..7=Dom). Snapshot al momento dell''assegnazione.';
COMMENT ON COLUMN public.workout_programs.active_days IS 'Giorni della settimana di default per il programma (1=Lun..7=Dom)';