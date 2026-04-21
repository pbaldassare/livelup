-- Aggiunge muscle_groups ai template
ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS muscle_groups text[] NOT NULL DEFAULT '{}';

-- Aggiunge sets_data ai template_exercises (set eterogenei)
ALTER TABLE public.template_exercises
  ADD COLUMN IF NOT EXISTS sets_data jsonb;

-- Aggiunge sets_data ai workout_exercises (lato atleta)
ALTER TABLE public.workout_exercises
  ADD COLUMN IF NOT EXISTS sets_data jsonb;