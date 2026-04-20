-- Enum for protocol types
DO $$ BEGIN
  CREATE TYPE public.protocol_type AS ENUM ('SET', 'TOP_SET_BACKOFF', 'RAMPING', 'EMOM', 'AMRAP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- template_blocks
CREATE TABLE IF NOT EXISTS public.template_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  type public.protocol_type NOT NULL DEFAULT 'SET',
  name TEXT,
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  info_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_template_blocks_template ON public.template_blocks(template_id, order_index);

ALTER TABLE public.template_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all template_blocks"
  ON public.template_blocks FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "PT manage blocks of own templates"
  ON public.template_blocks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.workout_templates t
    WHERE t.id = template_blocks.template_id AND t.pt_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workout_templates t
    WHERE t.id = template_blocks.template_id AND t.pt_user_id = auth.uid()
  ));

CREATE POLICY "Atleta view blocks of assigned templates"
  ON public.template_blocks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workout_templates t
    WHERE t.id = template_blocks.template_id
      AND public.are_connected(t.pt_user_id, auth.uid())
  ));

CREATE TRIGGER trg_template_blocks_updated_at
  BEFORE UPDATE ON public.template_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- workout_blocks
CREATE TABLE IF NOT EXISTS public.workout_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  type public.protocol_type NOT NULL DEFAULT 'SET',
  name TEXT,
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  info_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_blocks_workout ON public.workout_blocks(workout_id, order_index);

ALTER TABLE public.workout_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all workout_blocks"
  ON public.workout_blocks FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Workout participants view blocks"
  ON public.workout_blocks FOR SELECT
  USING (public.has_workout_access(auth.uid(), workout_id));

CREATE POLICY "PT manage blocks of own workouts"
  ON public.workout_blocks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.workouts w
    WHERE w.id = workout_blocks.workout_id AND w.pt_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workouts w
    WHERE w.id = workout_blocks.workout_id AND w.pt_user_id = auth.uid()
  ));

CREATE TRIGGER trg_workout_blocks_updated_at
  BEFORE UPDATE ON public.workout_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add block_id columns
ALTER TABLE public.template_exercises
  ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES public.template_blocks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_template_exercises_block ON public.template_exercises(block_id);

ALTER TABLE public.workout_exercises
  ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES public.workout_blocks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_workout_exercises_block ON public.workout_exercises(block_id);