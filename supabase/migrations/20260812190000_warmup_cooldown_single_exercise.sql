-- =====================================================
-- Warmup / stretching: oltre al template, singolo esercizio
-- =====================================================

ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS warmup_exercise_id uuid REFERENCES public.exercises(id) ON DELETE SET NULL;

ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS cooldown_exercise_id uuid REFERENCES public.exercises(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.workout_templates.warmup_exercise_id IS
  'Alternativa a warmup_template_id: un solo esercizio di riscaldamento.';
COMMENT ON COLUMN public.workout_templates.cooldown_exercise_id IS
  'Alternativa a cooldown_template_id: un solo esercizio di stretching.';

-- Mutual exclusion: template XOR exercise (quando il flag include è true)
CREATE OR REPLACE FUNCTION public.enforce_warmup_cooldown_source()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.warmup_template_id IS NOT NULL AND NEW.warmup_exercise_id IS NOT NULL THEN
    RAISE EXCEPTION 'Scegli template O singolo esercizio per il riscaldamento, non entrambi';
  END IF;
  IF NEW.cooldown_template_id IS NOT NULL AND NEW.cooldown_exercise_id IS NOT NULL THEN
    RAISE EXCEPTION 'Scegli template O singolo esercizio per lo stretching, non entrambi';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_warmup_cooldown_source ON public.workout_templates;
CREATE TRIGGER trg_enforce_warmup_cooldown_source
  BEFORE INSERT OR UPDATE OF warmup_template_id, warmup_exercise_id, cooldown_template_id, cooldown_exercise_id
  ON public.workout_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_warmup_cooldown_source();

CREATE INDEX IF NOT EXISTS idx_workout_templates_warmup_exercise
  ON public.workout_templates (warmup_exercise_id)
  WHERE warmup_exercise_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workout_templates_cooldown_exercise
  ON public.workout_templates (cooldown_exercise_id)
  WHERE cooldown_exercise_id IS NOT NULL;
