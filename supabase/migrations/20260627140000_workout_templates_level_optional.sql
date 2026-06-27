-- Livello scheda facoltativo: default "nessuno" (non impostato) invece di "intermedio"
ALTER TABLE public.workout_templates
  ALTER COLUMN difficulty_level SET DEFAULT 'nessuno';
