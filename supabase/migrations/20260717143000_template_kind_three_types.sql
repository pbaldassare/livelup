-- =====================================================
-- Tre tipologie scheda: libera | propedeutica | progressiva
-- =====================================================

ALTER TABLE public.workout_templates
  DROP CONSTRAINT IF EXISTS workout_templates_template_kind_check;

ALTER TABLE public.workout_templates
  ADD CONSTRAINT workout_templates_template_kind_check
  CHECK (template_kind IN ('libera', 'propedeutica', 'progressiva'));

COMMENT ON COLUMN public.workout_templates.template_kind IS
  'Tipologia scheda: libera | propedeutica | progressiva';

ALTER TABLE public.workouts
  DROP CONSTRAINT IF EXISTS workouts_template_kind_check;

ALTER TABLE public.workouts
  ADD CONSTRAINT workouts_template_kind_check
  CHECK (template_kind IN ('libera', 'propedeutica', 'progressiva'));

COMMENT ON COLUMN public.workouts.template_kind IS
  'Snapshot tipologia scheda all''assegnazione: libera | propedeutica | progressiva';

-- Riordino atleta resta consentito solo per scheda libera (già in RPC)
