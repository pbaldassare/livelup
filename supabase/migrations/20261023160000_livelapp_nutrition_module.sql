-- Modulo nutrizione Livelapp (PT + atleta, un piano attivo globale per atleta)

-- -----------------------------------------------------
-- Enum-like checks
-- -----------------------------------------------------

-- meal_type: colazione | spuntino_mattina | pranzo | spuntino_sera | cena | altro

-- -----------------------------------------------------
-- Template macro di sistema
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.nutrition_macro_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  daily_kcal INTEGER NOT NULL CHECK (daily_kcal > 0),
  protein_g INTEGER NOT NULL CHECK (protein_g >= 0),
  carbs_g INTEGER NOT NULL CHECK (carbs_g >= 0),
  fat_g INTEGER NOT NULL CHECK (fat_g >= 0),
  is_platform BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Alimenti di riferimento (per 100 g)
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.food_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  per_100g_kcal NUMERIC(8,2) NOT NULL CHECK (per_100g_kcal >= 0),
  per_100g_protein_g NUMERIC(8,2) NOT NULL DEFAULT 0,
  per_100g_carbs_g NUMERIC(8,2) NOT NULL DEFAULT 0,
  per_100g_fat_g NUMERIC(8,2) NOT NULL DEFAULT 0,
  is_platform BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_templates_name ON public.food_templates (lower(name));

-- -----------------------------------------------------
-- Piano nutrizionale assegnato
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.nutrition_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pt_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  macro_template_id UUID REFERENCES public.nutrition_macro_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Piano nutrizionale',
  notes TEXT,
  daily_kcal INTEGER NOT NULL CHECK (daily_kcal > 0),
  protein_g INTEGER NOT NULL CHECK (protein_g >= 0),
  carbs_g INTEGER NOT NULL CHECK (carbs_g >= 0),
  fat_g INTEGER NOT NULL CHECK (fat_g >= 0),
  is_active BOOLEAN NOT NULL DEFAULT false,
  starts_on DATE,
  ends_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_nutrition_plans_one_active_per_atleta
  ON public.nutrition_plans (atleta_user_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_nutrition_plans_atleta ON public.nutrition_plans (atleta_user_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_pt ON public.nutrition_plans (pt_user_id);

-- -----------------------------------------------------
-- Diario alimentare
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.nutrition_diary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_on DATE NOT NULL DEFAULT (CURRENT_DATE),
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
  food_template_id UUID REFERENCES public.food_templates(id) ON DELETE SET NULL,
  custom_name TEXT,
  grams NUMERIC(10,2) NOT NULL CHECK (grams > 0),
  kcal NUMERIC(10,2) NOT NULL DEFAULT 0,
  protein_g NUMERIC(10,2) NOT NULL DEFAULT 0,
  carbs_g NUMERIC(10,2) NOT NULL DEFAULT 0,
  fat_g NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nutrition_diary_food_label CHECK (
    food_template_id IS NOT NULL OR (custom_name IS NOT NULL AND length(trim(custom_name)) > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_nutrition_diary_atleta_day
  ON public.nutrition_diary_entries (atleta_user_id, logged_on DESC);

-- -----------------------------------------------------
-- updated_at
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.nutrition_plans_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_nutrition_plans_updated_at ON public.nutrition_plans;
CREATE TRIGGER trg_nutrition_plans_updated_at
  BEFORE UPDATE ON public.nutrition_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.nutrition_plans_set_updated_at();

-- -----------------------------------------------------
-- Attivazione piano (un solo attivo per atleta)
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.activate_nutrition_plan(_plan_id UUID)
RETURNS public.nutrition_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.nutrition_plans;
  v_uid UUID := auth.uid();
BEGIN
  SELECT * INTO v_plan FROM public.nutrition_plans WHERE id = _plan_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Piano non trovato';
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;

  IF NOT public.has_role(v_uid, 'pt') OR NOT public.are_connected(v_uid, v_plan.atleta_user_id) THEN
    RAISE EXCEPTION 'Non autorizzato ad attivare questo piano';
  END IF;

  IF v_plan.pt_user_id <> v_uid THEN
    RAISE EXCEPTION 'Solo il Professionista che ha creato il piano può attivarlo';
  END IF;

  UPDATE public.nutrition_plans
  SET is_active = false, updated_at = now()
  WHERE atleta_user_id = v_plan.atleta_user_id AND is_active = true AND id <> _plan_id;

  UPDATE public.nutrition_plans
  SET is_active = true, updated_at = now()
  WHERE id = _plan_id
  RETURNING * INTO v_plan;

  RETURN v_plan;
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_nutrition_plan(UUID) TO authenticated;

-- -----------------------------------------------------
-- GRANT
-- -----------------------------------------------------

GRANT SELECT ON public.nutrition_macro_templates TO authenticated;
GRANT SELECT ON public.food_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_diary_entries TO authenticated;

-- -----------------------------------------------------
-- RLS
-- -----------------------------------------------------

ALTER TABLE public.nutrition_macro_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_diary_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nutrition_macro_templates read" ON public.nutrition_macro_templates;
CREATE POLICY "nutrition_macro_templates read"
  ON public.nutrition_macro_templates FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "food_templates read" ON public.food_templates;
CREATE POLICY "food_templates read"
  ON public.food_templates FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "nutrition_plans pt select" ON public.nutrition_plans;
CREATE POLICY "nutrition_plans pt select"
  ON public.nutrition_plans FOR SELECT
  TO authenticated
  USING (
    auth.uid() = atleta_user_id
    OR (
      public.has_role(auth.uid(), 'pt')
      AND public.are_connected(auth.uid(), atleta_user_id)
    )
  );

DROP POLICY IF EXISTS "nutrition_plans pt insert" ON public.nutrition_plans;
CREATE POLICY "nutrition_plans pt insert"
  ON public.nutrition_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'pt')
    AND auth.uid() = pt_user_id
    AND public.are_connected(auth.uid(), atleta_user_id)
  );

DROP POLICY IF EXISTS "nutrition_plans pt update" ON public.nutrition_plans;
CREATE POLICY "nutrition_plans pt update"
  ON public.nutrition_plans FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'pt')
    AND auth.uid() = pt_user_id
    AND public.are_connected(auth.uid(), atleta_user_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'pt')
    AND auth.uid() = pt_user_id
    AND public.are_connected(auth.uid(), atleta_user_id)
  );

DROP POLICY IF EXISTS "nutrition_plans pt delete" ON public.nutrition_plans;
CREATE POLICY "nutrition_plans pt delete"
  ON public.nutrition_plans FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'pt')
    AND auth.uid() = pt_user_id
    AND public.are_connected(auth.uid(), atleta_user_id)
    AND is_active = false
  );

DROP POLICY IF EXISTS "nutrition_diary atleta select" ON public.nutrition_diary_entries;
CREATE POLICY "nutrition_diary atleta select"
  ON public.nutrition_diary_entries FOR SELECT
  TO authenticated
  USING (
    auth.uid() = atleta_user_id
    OR (
      public.has_role(auth.uid(), 'pt')
      AND public.are_connected(auth.uid(), atleta_user_id)
    )
  );

DROP POLICY IF EXISTS "nutrition_diary atleta write" ON public.nutrition_diary_entries;
CREATE POLICY "nutrition_diary atleta write"
  ON public.nutrition_diary_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = atleta_user_id);

DROP POLICY IF EXISTS "nutrition_diary atleta update" ON public.nutrition_diary_entries;
CREATE POLICY "nutrition_diary atleta update"
  ON public.nutrition_diary_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = atleta_user_id)
  WITH CHECK (auth.uid() = atleta_user_id);

DROP POLICY IF EXISTS "nutrition_diary atleta delete" ON public.nutrition_diary_entries;
CREATE POLICY "nutrition_diary atleta delete"
  ON public.nutrition_diary_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = atleta_user_id);

-- -----------------------------------------------------
-- Seed macro templates (10)
-- -----------------------------------------------------

INSERT INTO public.nutrition_macro_templates (slug, name, description, daily_kcal, protein_g, carbs_g, fat_g, sort_order)
VALUES
  ('keto', 'Cheto / low carb', 'Carboidrati molto bassi, grassi come principale fonte energetica.', 1800, 120, 30, 140, 10),
  ('intermittent_16_8', 'Digiuno intermittente 16:8', 'Finestra alimentare di 8 ore; target giornaliero moderato.', 2000, 130, 180, 70, 20),
  ('mediterranea', 'Mediterranea', 'Equilibrio tra carboidrati complessi, proteine e grassi buoni.', 2200, 110, 250, 75, 30),
  ('massa_uomo', 'Massa — uomo', 'Surplus moderato per aumento massa magra.', 2800, 170, 320, 85, 40),
  ('massa_donna', 'Massa — donna', 'Surplus leggero per atlete.', 2300, 130, 260, 70, 50),
  ('dimagrimento_uomo', 'Dimagrimento — uomo', 'Deficit moderato con proteine elevate.', 2000, 160, 150, 65, 60),
  ('dimagrimento_donna', 'Dimagrimento — donna', 'Deficit leggero sostenibile.', 1700, 120, 140, 55, 70),
  ('mantenimento_uomo', 'Mantenimento — uomo', 'Apporto energetico di mantenimento.', 2500, 140, 280, 75, 80),
  ('mantenimento_donna', 'Mantenimento — donna', 'Apporto energetico di mantenimento.', 2000, 110, 220, 65, 90),
  ('alto_proteine', 'Alto proteico', 'Focus su recupero e sazietà.', 2100, 180, 160, 60, 100)
ON CONFLICT (slug) DO NOTHING;

-- Seed alimenti base (solo se catalogo vuoto)
INSERT INTO public.food_templates (name, brand, per_100g_kcal, per_100g_protein_g, per_100g_carbs_g, per_100g_fat_g)
SELECT v.name, v.brand, v.kcal, v.protein, v.carbs, v.fat
FROM (
  VALUES
  ('Petto di pollo', NULL::TEXT, 165::NUMERIC, 31::NUMERIC, 0::NUMERIC, 3.6::NUMERIC),
  ('Uovo intero', NULL, 155, 13, 1.1, 11),
  ('Riso basmati cotto', NULL, 130, 2.7, 28, 0.3),
  ('Pasta di semola cotta', NULL, 158, 5.8, 30, 0.9),
  ('Pane integrale', NULL, 247, 13, 41, 3.4),
  ('Latte parzialmente scremato', NULL, 46, 3.4, 4.8, 1.5),
  ('Yogurt greco 0%', NULL, 59, 10, 3.6, 0.4),
  ('Salmone', NULL, 208, 20, 0, 13),
  ('Tonno al naturale', NULL, 116, 26, 0, 1),
  ('Ricotta vaccina', NULL, 174, 11, 3, 13),
  ('Mozzarella', NULL, 280, 18, 2.2, 22),
  ('Avocado', NULL, 160, 2, 8.5, 15),
  ('Olio extravergine d''oliva', NULL, 884, 0, 0, 100),
  ('Mandorle', NULL, 579, 21, 22, 50),
  ('Banana', NULL, 89, 1.1, 23, 0.3),
  ('Mela', NULL, 52, 0.3, 14, 0.2),
  ('Patate lesse', NULL, 87, 1.9, 20, 0.1),
  ('Broccoli', NULL, 34, 2.8, 7, 0.4),
  ('Petto di tacchino', NULL, 135, 30, 0, 1),
  ('Fiocchi d''avena', NULL, 389, 17, 66, 7),
  ('Whey proteine', NULL, 400, 80, 8, 5),
  ('Cottage cheese', NULL, 98, 11, 3.4, 4.3),
  ('Pomodoro', NULL, 18, 0.9, 3.9, 0.2),
  ('Riso integrale cotto', NULL, 123, 2.7, 25, 1),
  ('Ceci cotti', NULL, 164, 8.9, 27, 2.6),
  ('Lenticchie cotte', NULL, 116, 9, 20, 0.4),
  ('Bresaola', NULL, 151, 33, 0, 2.6),
  ('Prosciutto crudo', NULL, 263, 26, 0, 18),
  ('Pangrattato', NULL, 395, 13, 72, 5.3),
  ('Burro di arachidi', NULL::TEXT, 588::NUMERIC, 25::NUMERIC, 20::NUMERIC, 50::NUMERIC)
) AS v(name, brand, kcal, protein, carbs, fat)
WHERE NOT EXISTS (SELECT 1 FROM public.food_templates WHERE is_platform = true LIMIT 1);
