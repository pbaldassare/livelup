ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS warmup_exercise_id uuid REFERENCES public.exercises(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cooldown_exercise_id uuid REFERENCES public.exercises(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.workout_templates_routine_xor()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.warmup_template_id IS NOT NULL AND NEW.warmup_exercise_id IS NOT NULL THEN
    RAISE EXCEPTION 'Riscaldamento: scegli un template oppure un esercizio, non entrambi';
  END IF;
  IF NEW.cooldown_template_id IS NOT NULL AND NEW.cooldown_exercise_id IS NOT NULL THEN
    RAISE EXCEPTION 'Stretching: scegli un template oppure un esercizio, non entrambi';
  END IF;
  IF NEW.include_warmup IS NOT TRUE THEN
    NEW.warmup_template_id := NULL;
    NEW.warmup_exercise_id := NULL;
  END IF;
  IF NEW.include_cooldown IS NOT TRUE THEN
    NEW.cooldown_template_id := NULL;
    NEW.cooldown_exercise_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workout_templates_routine_xor ON public.workout_templates;
CREATE TRIGGER trg_workout_templates_routine_xor
BEFORE INSERT OR UPDATE ON public.workout_templates
FOR EACH ROW EXECUTE FUNCTION public.workout_templates_routine_xor();