-- Nutrizione fase 3: alimenti PT, link ricetta nel diario

ALTER TABLE public.food_templates
  ADD COLUMN IF NOT EXISTS pt_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_food_templates_pt ON public.food_templates (pt_user_id)
  WHERE pt_user_id IS NOT NULL;

ALTER TABLE public.nutrition_diary_entries
  ADD COLUMN IF NOT EXISTS recipe_id UUID REFERENCES public.nutrition_template_recipes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_nutrition_diary_recipe ON public.nutrition_diary_entries (recipe_id)
  WHERE recipe_id IS NOT NULL;

-- food_templates: lettura piattaforma + propri del PT + del PT collegato (atleta)
DROP POLICY IF EXISTS "food_templates read" ON public.food_templates;
CREATE POLICY "food_templates read"
  ON public.food_templates FOR SELECT
  TO authenticated
  USING (
    is_platform = true
    OR pt_user_id IS NULL
    OR pt_user_id = auth.uid()
    OR (
      public.is_atleta(auth.uid())
      AND pt_user_id IS NOT NULL
      AND public.are_connected(pt_user_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "food_templates pt insert" ON public.food_templates;
CREATE POLICY "food_templates pt insert"
  ON public.food_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'pt')
    AND pt_user_id = auth.uid()
    AND is_platform = false
  );

DROP POLICY IF EXISTS "food_templates pt update" ON public.food_templates;
CREATE POLICY "food_templates pt update"
  ON public.food_templates FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'pt') AND pt_user_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'pt') AND pt_user_id = auth.uid());

DROP POLICY IF EXISTS "food_templates pt delete" ON public.food_templates;
CREATE POLICY "food_templates pt delete"
  ON public.food_templates FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'pt') AND pt_user_id = auth.uid());

GRANT INSERT, UPDATE, DELETE ON public.food_templates TO authenticated;
