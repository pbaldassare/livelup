-- Mirror paste Lovable Cloud — same as 20260728120000_warmup_cooldown_templates.sql

ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS template_role text NOT NULL DEFAULT 'main';

ALTER TABLE public.workout_templates
  DROP CONSTRAINT IF EXISTS workout_templates_template_role_check;

ALTER TABLE public.workout_templates
  ADD CONSTRAINT workout_templates_template_role_check
  CHECK (template_role IN ('main', 'warmup', 'cooldown'));

ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS include_warmup boolean NOT NULL DEFAULT false;

ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS include_cooldown boolean NOT NULL DEFAULT false;

ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS warmup_template_id uuid REFERENCES public.workout_templates(id) ON DELETE SET NULL;

ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS cooldown_template_id uuid REFERENCES public.workout_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workout_templates_pt_role
  ON public.workout_templates (pt_user_id, template_role);

ALTER TABLE public.workout_exercises
  ADD COLUMN IF NOT EXISTS phase text NOT NULL DEFAULT 'main';

ALTER TABLE public.workout_exercises
  DROP CONSTRAINT IF EXISTS workout_exercises_phase_check;

ALTER TABLE public.workout_exercises
  ADD CONSTRAINT workout_exercises_phase_check
  CHECK (phase IN ('warmup', 'main', 'cooldown'));

ALTER TABLE public.workout_blocks
  ADD COLUMN IF NOT EXISTS phase text NOT NULL DEFAULT 'main';

ALTER TABLE public.workout_blocks
  DROP CONSTRAINT IF EXISTS workout_blocks_phase_check;

ALTER TABLE public.workout_blocks
  ADD CONSTRAINT workout_blocks_phase_check
  CHECK (phase IN ('warmup', 'main', 'cooldown'));

CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_phase
  ON public.workout_exercises (workout_id, phase);
