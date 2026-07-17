-- Hotfix: colonne tipologie scheda + riordino atleta
-- Risolve: "column workouts.athlete_reordered_at does not exist"
-- Idempotente.

ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS template_kind text NOT NULL DEFAULT 'libera';

ALTER TABLE public.workout_templates
  DROP CONSTRAINT IF EXISTS workout_templates_template_kind_check;

ALTER TABLE public.workout_templates
  ADD CONSTRAINT workout_templates_template_kind_check
  CHECK (template_kind IN ('libera', 'propedeutica', 'progressiva'));

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS template_kind text NOT NULL DEFAULT 'libera';

ALTER TABLE public.workouts
  DROP CONSTRAINT IF EXISTS workouts_template_kind_check;

ALTER TABLE public.workouts
  ADD CONSTRAINT workouts_template_kind_check
  CHECK (template_kind IN ('libera', 'propedeutica', 'progressiva'));

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS athlete_reordered_at timestamptz;

COMMENT ON COLUMN public.workouts.athlete_reordered_at IS
  'Timestamp ultimo riordino esercizi free da parte dell''atleta (scheda libera)';
