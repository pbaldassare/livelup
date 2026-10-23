-- Nutrizione fase 2: template PT, ricette piattaforma, target per pasto

-- -----------------------------------------------------
-- Template piano salvati dal PT
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.nutrition_pt_plan_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Piano nutrizionale',
  notes TEXT,
  macro_template_id UUID REFERENCES public.nutrition_macro_templates(id) ON DELETE SET NULL,
  daily_kcal INTEGER NOT NULL CHECK (daily_kcal > 0),
  protein_g INTEGER NOT NULL CHECK (protein_g >= 0),
  carbs_g INTEGER NOT NULL CHECK (carbs_g >= 0),
  fat_g INTEGER NOT NULL CHECK (fat_g >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_pt_plan_templates_pt
  ON public.nutrition_pt_plan_templates (pt_user_id, created_at DESC);

-- -----------------------------------------------------
-- Ricette di riferimento (ispirate a catalogo template, senza dipendenze Cibarius)
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.nutrition_template_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (
    category IN (
      'colazione',
      'spuntino',
      'pranzo',
      'cena',
      'post_allenamento',
      'vegetariano',
      'veloce'
    )
  ),
  name TEXT NOT NULL,
  description TEXT,
  servings INTEGER NOT NULL DEFAULT 1 CHECK (servings > 0),
  per_serving_kcal INTEGER NOT NULL CHECK (per_serving_kcal > 0),
  per_serving_protein_g INTEGER NOT NULL DEFAULT 0,
  per_serving_carbs_g INTEGER NOT NULL DEFAULT 0,
  per_serving_fat_g INTEGER NOT NULL DEFAULT 0,
  ingredients TEXT NOT NULL,
  instructions TEXT,
  is_platform BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_template_recipes_category
  ON public.nutrition_template_recipes (category, sort_order);

-- -----------------------------------------------------
-- Target macro per pasto (opzionale, legato al piano)
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.nutrition_plan_meal_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.nutrition_plans(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL CHECK (
    meal_type IN (
      'colazione',
      'spuntino_mattina',
      'pranzo',
      'spuntino_sera',
      'cena',
      'altro'
    )
  ),
  kcal INTEGER NOT NULL DEFAULT 0 CHECK (kcal >= 0),
  protein_g INTEGER NOT NULL DEFAULT 0 CHECK (protein_g >= 0),
  carbs_g INTEGER NOT NULL DEFAULT 0 CHECK (carbs_g >= 0),
  fat_g INTEGER NOT NULL DEFAULT 0 CHECK (fat_g >= 0),
  UNIQUE (plan_id, meal_type)
);

CREATE INDEX IF NOT EXISTS idx_nutrition_plan_meal_targets_plan
  ON public.nutrition_plan_meal_targets (plan_id);

-- updated_at template PT
CREATE OR REPLACE FUNCTION public.nutrition_pt_plan_templates_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_nutrition_pt_plan_templates_updated_at ON public.nutrition_pt_plan_templates;
CREATE TRIGGER trg_nutrition_pt_plan_templates_updated_at
  BEFORE UPDATE ON public.nutrition_pt_plan_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.nutrition_pt_plan_templates_set_updated_at();

-- -----------------------------------------------------
-- GRANT
-- -----------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_pt_plan_templates TO authenticated;
GRANT SELECT ON public.nutrition_template_recipes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_plan_meal_targets TO authenticated;

-- -----------------------------------------------------
-- RLS
-- -----------------------------------------------------

ALTER TABLE public.nutrition_pt_plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_template_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_plan_meal_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nutrition_pt_plan_templates own" ON public.nutrition_pt_plan_templates;
CREATE POLICY "nutrition_pt_plan_templates own"
  ON public.nutrition_pt_plan_templates
  FOR ALL
  TO authenticated
  USING (auth.uid() = pt_user_id)
  WITH CHECK (
    public.has_role(auth.uid(), 'pt')
    AND auth.uid() = pt_user_id
  );

DROP POLICY IF EXISTS "nutrition_template_recipes read" ON public.nutrition_template_recipes;
CREATE POLICY "nutrition_template_recipes read"
  ON public.nutrition_template_recipes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "nutrition_plan_meal_targets select" ON public.nutrition_plan_meal_targets;
CREATE POLICY "nutrition_plan_meal_targets select"
  ON public.nutrition_plan_meal_targets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nutrition_plans p
      WHERE p.id = plan_id
        AND (
          auth.uid() = p.atleta_user_id
          OR (
            public.has_role(auth.uid(), 'pt')
            AND public.are_connected(auth.uid(), p.atleta_user_id)
          )
        )
    )
  );

DROP POLICY IF EXISTS "nutrition_plan_meal_targets pt write" ON public.nutrition_plan_meal_targets;
CREATE POLICY "nutrition_plan_meal_targets pt write"
  ON public.nutrition_plan_meal_targets
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'pt')
    AND EXISTS (
      SELECT 1 FROM public.nutrition_plans p
      WHERE p.id = plan_id
        AND p.pt_user_id = auth.uid()
        AND public.are_connected(auth.uid(), p.atleta_user_id)
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'pt')
    AND EXISTS (
      SELECT 1 FROM public.nutrition_plans p
      WHERE p.id = plan_id
        AND p.pt_user_id = auth.uid()
        AND public.are_connected(auth.uid(), p.atleta_user_id)
    )
  );

-- -----------------------------------------------------
-- Seed ricette (set iniziale; espandibile)
-- -----------------------------------------------------

INSERT INTO public.nutrition_template_recipes (
  slug, category, name, description, per_serving_kcal, per_serving_protein_g,
  per_serving_carbs_g, per_serving_fat_g, ingredients, instructions, sort_order
)
VALUES
  ('colazione-porridge-proteico', 'colazione', 'Porridge proteico', 'Colazione saziante pre allenamento.', 420, 28, 52, 10,
   '80g fiocchi d''avena\n200ml latte o bevanda vegetale\n1 scoop whey\n1/2 banana', 'Cuoci l''avena con il latte 5 min. Aggiungi whey e banana a fine cottura.', 10),
  ('colazione-uova-avocado', 'colazione', 'Uova strapazzate e avocado', 'Grassi buoni e proteine.', 380, 22, 8, 28,
   '2 uova\n1/2 avocado\n50g pane integrale', 'Strapazza le uova. Tosta il pane e servi con avocado schiacciato.', 20),
  ('colazione-yogurt-avena', 'colazione', 'Yogurt greco e avena', 'Veloce, senza cottura.', 310, 24, 38, 6,
   '200g yogurt greco 0%\n50g avena\n100g frutti di bosco', 'Mescola tutto in una ciotola.', 30),
  ('spuntino-mandorle-frutta', 'spuntino', 'Frutta e mandorle', 'Spuntino bilanciato.', 220, 6, 22, 12,
   '1 mela\n20g mandorle', 'Consuma a metà mattina o pomeriggio.', 10),
  ('spuntino-hummus-verdure', 'spuntino', 'Hummus e verdure', 'Fibre e proteine vegetali.', 180, 8, 18, 8,
   '80g hummus\n150g verdure crude', 'Usa carote, cetriolo o peperoni.', 20),
  ('pranzo-pollo-riso', 'pranzo', 'Pollo, riso e broccoli', 'Classico post workout.', 520, 45, 55, 12,
   '150g petto di pollo\n80g riso crudo\n200g broccoli\n10g olio EVO', 'Cuoci il riso. Griglia il pollo. Vaporizza i broccoli.', 10),
  ('pranzo-pasta-tonno', 'pranzo', 'Pasta al tonno', 'Pranzo veloce.', 480, 32, 62, 10,
   '80g pasta\n1 scatola tonno\n100g pomodorini\n5g olio', 'Condisci la pasta con tonno, pomodorini e olio.', 20),
  ('pranzo-bowl-mediterranea', 'pranzo', 'Bowl mediterranea', 'Legumi e verdure.', 450, 22, 58, 14,
   '120g ceci\n80g quinoa cotta\nVerdure miste\n10g olio', 'Assembla la bowl con ceci, quinoa e verdure crude.', 30),
  ('cena-salmone-patate', 'cena', 'Salmone e patate', 'Omega-3 e carboidrati moderati.', 490, 35, 42, 18,
   '150g salmone\n200g patate\nInsalata verde', 'Forno o padella per salmone; patate lesse o al forno.', 10),
  ('cena-tacchino-verdure', 'cena', 'Tacchino e verdure grigliate', 'Leggera e proteica.', 380, 40, 18, 12,
   '150g tacchino\n300g verdure miste\n5g olio', 'Griglia tacchino e verdure.', 20),
  ('cena-frittata-verdure', 'cena', 'Frittata di verdure', 'Cena veloce.', 320, 24, 12, 20,
   '3 uova\n200g verdure\n5g olio', 'Salta le verdure, aggiungi uova sbattute.', 30),
  ('post-shake-banana', 'post_allenamento', 'Shake banana e whey', 'Recupero rapido.', 280, 30, 35, 3,
   '1 banana\n1 scoop whey\n300ml acqua o latte', 'Frulla e consuma entro 30 min.', 10),
  ('post-yogurt-miele', 'post_allenamento', 'Yogurt, miele e avena', 'Recupero leggero.', 340, 22, 48, 6,
   '200g yogurt greco\n20g miele\n40g avena', 'Mescola in ciotola.', 20),
  ('veg-lenticchie-curry', 'vegetariano', 'Curry di lenticchie', 'Piatto unico vegetale.', 410, 22, 58, 10,
   '150g lenticchie cotte\n150g riso\nCurry e verdure', 'Salta verdure, aggiungi lenticchie e spezie.', 10),
  ('veg-tofu-verdure', 'vegetariano', 'Tofu saltato e riso', 'Proteine vegetali.', 430, 28, 52, 12,
   '150g tofu\n80g riso\nVerdure miste', 'Marina il tofu e saltalo in padella.', 20),
  ('veloce-panino-pollo', 'veloce', 'Panino pollo e insalata', 'Pranzo on the go.', 420, 32, 45, 12,
   '80g pane\n100g pollo\nInsalata', 'Assembla il panino.', 10),
  ('veloce-uova-pane', 'veloce', 'Uova e pane integrale', '5 minuti.', 350, 20, 38, 12,
   '2 uova\n60g pane', 'Uova alla coque o strapazzate.', 20)
ON CONFLICT (slug) DO NOTHING;
