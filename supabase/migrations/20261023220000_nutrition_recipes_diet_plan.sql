-- Campi aggiuntivi ricette (import Cibarius)

ALTER TABLE public.nutrition_template_recipes
  ADD COLUMN IF NOT EXISTS diet_plan TEXT,
  ADD COLUMN IF NOT EXISTS prep_time_min INTEGER;

CREATE INDEX IF NOT EXISTS idx_nutrition_template_recipes_diet
  ON public.nutrition_template_recipes (diet_plan, category);
