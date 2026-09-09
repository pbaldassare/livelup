-- =====================================================
-- Riscaldamento / stretching: lista di esercizi (non più uno solo)
-- warmup_exercise_id / cooldown_exercise_id restano il primo della lista (legacy).
-- =====================================================

ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS warmup_exercise_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cooldown_exercise_ids uuid[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.workout_templates.warmup_exercise_ids IS
  'Esercizi di riscaldamento (alternativa a warmup_template_id). Il primo è anche warmup_exercise_id.';
COMMENT ON COLUMN public.workout_templates.cooldown_exercise_ids IS
  'Esercizi di stretching (alternativa a cooldown_template_id). Il primo è anche cooldown_exercise_id.';

UPDATE public.workout_templates
SET warmup_exercise_ids = ARRAY[warmup_exercise_id]
WHERE warmup_exercise_id IS NOT NULL
  AND COALESCE(cardinality(warmup_exercise_ids), 0) = 0;

UPDATE public.workout_templates
SET cooldown_exercise_ids = ARRAY[cooldown_exercise_id]
WHERE cooldown_exercise_id IS NOT NULL
  AND COALESCE(cardinality(cooldown_exercise_ids), 0) = 0;

CREATE OR REPLACE FUNCTION public.workout_templates_routine_xor()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.warmup_exercise_ids := array_remove(COALESCE(NEW.warmup_exercise_ids, '{}'), NULL);
  NEW.cooldown_exercise_ids := array_remove(COALESCE(NEW.cooldown_exercise_ids, '{}'), NULL);

  IF NEW.include_warmup IS NOT TRUE THEN
    NEW.warmup_template_id := NULL;
    NEW.warmup_exercise_id := NULL;
    NEW.warmup_exercise_ids := '{}';
  ELSE
    IF COALESCE(cardinality(NEW.warmup_exercise_ids), 0) = 0 AND NEW.warmup_exercise_id IS NOT NULL THEN
      NEW.warmup_exercise_ids := ARRAY[NEW.warmup_exercise_id];
    END IF;
    IF COALESCE(cardinality(NEW.warmup_exercise_ids), 0) > 0 THEN
      NEW.warmup_exercise_id := NEW.warmup_exercise_ids[1];
    ELSE
      NEW.warmup_exercise_id := NULL;
    END IF;
  END IF;

  IF NEW.include_cooldown IS NOT TRUE THEN
    NEW.cooldown_template_id := NULL;
    NEW.cooldown_exercise_id := NULL;
    NEW.cooldown_exercise_ids := '{}';
  ELSE
    IF COALESCE(cardinality(NEW.cooldown_exercise_ids), 0) = 0 AND NEW.cooldown_exercise_id IS NOT NULL THEN
      NEW.cooldown_exercise_ids := ARRAY[NEW.cooldown_exercise_id];
    END IF;
    IF COALESCE(cardinality(NEW.cooldown_exercise_ids), 0) > 0 THEN
      NEW.cooldown_exercise_id := NEW.cooldown_exercise_ids[1];
    ELSE
      NEW.cooldown_exercise_id := NULL;
    END IF;
  END IF;

  IF NEW.warmup_template_id IS NOT NULL AND COALESCE(cardinality(NEW.warmup_exercise_ids), 0) > 0 THEN
    RAISE EXCEPTION 'Riscaldamento: scegli un template oppure una lista di esercizi, non entrambi';
  END IF;
  IF NEW.cooldown_template_id IS NOT NULL AND COALESCE(cardinality(NEW.cooldown_exercise_ids), 0) > 0 THEN
    RAISE EXCEPTION 'Stretching: scegli un template oppure una lista di esercizi, non entrambi';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_warmup_cooldown_source()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.warmup_exercise_ids := array_remove(COALESCE(NEW.warmup_exercise_ids, '{}'), NULL);
  NEW.cooldown_exercise_ids := array_remove(COALESCE(NEW.cooldown_exercise_ids, '{}'), NULL);

  IF NEW.warmup_template_id IS NOT NULL AND (
    NEW.warmup_exercise_id IS NOT NULL OR COALESCE(cardinality(NEW.warmup_exercise_ids), 0) > 0
  ) THEN
    RAISE EXCEPTION 'Scegli template O esercizi per il riscaldamento, non entrambi';
  END IF;
  IF NEW.cooldown_template_id IS NOT NULL AND (
    NEW.cooldown_exercise_id IS NOT NULL OR COALESCE(cardinality(NEW.cooldown_exercise_ids), 0) > 0
  ) THEN
    RAISE EXCEPTION 'Scegli template O esercizi per lo stretching, non entrambi';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_warmup_cooldown_source ON public.workout_templates;
CREATE TRIGGER trg_enforce_warmup_cooldown_source
  BEFORE INSERT OR UPDATE OF warmup_template_id, warmup_exercise_id, cooldown_template_id, cooldown_exercise_id, warmup_exercise_ids, cooldown_exercise_ids
  ON public.workout_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_warmup_cooldown_source();
