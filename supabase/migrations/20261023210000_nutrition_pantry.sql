-- Dispensa atleta (pantry) — senza ristorante / inventory PT

CREATE TABLE IF NOT EXISTS public.nutrition_pantry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_template_id UUID REFERENCES public.food_templates(id) ON DELETE SET NULL,
  custom_name TEXT,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit TEXT NOT NULL DEFAULT 'g' CHECK (unit IN ('g', 'ml', 'pz')),
  expires_on DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nutrition_pantry_label CHECK (
    food_template_id IS NOT NULL OR (custom_name IS NOT NULL AND length(trim(custom_name)) > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_nutrition_pantry_atleta
  ON public.nutrition_pantry_items (atleta_user_id, updated_at DESC);

CREATE OR REPLACE FUNCTION public.nutrition_pantry_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_nutrition_pantry_updated_at ON public.nutrition_pantry_items;
CREATE TRIGGER trg_nutrition_pantry_updated_at
  BEFORE UPDATE ON public.nutrition_pantry_items
  FOR EACH ROW
  EXECUTE FUNCTION public.nutrition_pantry_set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_pantry_items TO authenticated;

ALTER TABLE public.nutrition_pantry_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nutrition_pantry atleta select" ON public.nutrition_pantry_items;
CREATE POLICY "nutrition_pantry atleta select"
  ON public.nutrition_pantry_items FOR SELECT
  TO authenticated
  USING (
    auth.uid() = atleta_user_id
    OR (
      public.has_role(auth.uid(), 'pt')
      AND public.are_connected(auth.uid(), atleta_user_id)
    )
  );

DROP POLICY IF EXISTS "nutrition_pantry atleta write" ON public.nutrition_pantry_items;
CREATE POLICY "nutrition_pantry atleta write"
  ON public.nutrition_pantry_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = atleta_user_id);

DROP POLICY IF EXISTS "nutrition_pantry atleta update" ON public.nutrition_pantry_items;
CREATE POLICY "nutrition_pantry atleta update"
  ON public.nutrition_pantry_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = atleta_user_id)
  WITH CHECK (auth.uid() = atleta_user_id);

DROP POLICY IF EXISTS "nutrition_pantry atleta delete" ON public.nutrition_pantry_items;
CREATE POLICY "nutrition_pantry atleta delete"
  ON public.nutrition_pantry_items FOR DELETE
  TO authenticated
  USING (auth.uid() = atleta_user_id);
