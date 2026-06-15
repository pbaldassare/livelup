
-- ============================================================
-- COUPON TEMPLATES (Admin catalog) + extend coupons for PT→Athlete
-- ============================================================

-- 1) Catalog table
CREATE TABLE IF NOT EXISTS public.coupon_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  allowed_discount_types TEXT[] NOT NULL DEFAULT ARRAY['percentage']::TEXT[],
  max_discount_percentage NUMERIC,
  max_discount_amount NUMERIC,
  max_free_months INTEGER,
  max_free_sessions INTEGER,
  max_validity_days INTEGER,
  requires_active_connection BOOLEAN NOT NULL DEFAULT true,
  one_per_athlete BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.coupon_templates TO authenticated;
GRANT ALL ON public.coupon_templates TO service_role;

ALTER TABLE public.coupon_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active templates"
  ON public.coupon_templates FOR SELECT
  TO authenticated
  USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage templates"
  ON public.coupon_templates FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_coupon_templates_updated_at
  BEFORE UPDATE ON public.coupon_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Extend coupons table (additive, non-breaking)
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.coupon_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pt_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS target_athlete_ids UUID[],
  ADD COLUMN IF NOT EXISTS pt_package_id UUID REFERENCES public.pt_packages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS free_sessions INTEGER;

CREATE INDEX IF NOT EXISTS idx_coupons_pt_user_id ON public.coupons(pt_user_id);
CREATE INDEX IF NOT EXISTS idx_coupons_template_id ON public.coupons(template_id);

-- 3) RLS additions: PT manages own coupons; athletes can read PT coupons targeted to them or public to their PT
DROP POLICY IF EXISTS "PT can manage own coupons" ON public.coupons;
CREATE POLICY "PT can manage own coupons"
  ON public.coupons FOR ALL
  TO authenticated
  USING (pt_user_id = auth.uid())
  WITH CHECK (pt_user_id = auth.uid());

DROP POLICY IF EXISTS "Athletes can read PT coupons available to them" ON public.coupons;
CREATE POLICY "Athletes can read PT coupons available to them"
  ON public.coupons FOR SELECT
  TO authenticated
  USING (
    pt_user_id IS NOT NULL
    AND is_active = true
    AND public.are_connected(pt_user_id, auth.uid())
    AND (
      target_athlete_ids IS NULL
      OR cardinality(target_athlete_ids) = 0
      OR auth.uid() = ANY(target_athlete_ids)
    )
  );

-- 4) Seed default templates (idempotent)
INSERT INTO public.coupon_templates
  (name, description, icon, allowed_discount_types, max_discount_percentage, max_discount_amount, max_free_months, max_free_sessions, max_validity_days, requires_active_connection, one_per_athlete, sort_order)
VALUES
  ('Benvenuto Nuovo Atleta', 'Sconto sul primo pacchetto per nuovi atleti', 'sparkles', ARRAY['percentage','fixed_amount'], 30, 50, NULL, NULL, 60, false, true, 1),
  ('Promo Pacchetto', 'Sconto fisso o percentuale su un pacchetto', 'tag', ARRAY['percentage','fixed_amount'], 25, 100, NULL, NULL, 30, true, false, 2),
  ('Mese Omaggio', 'Uno o più mesi gratis sul pacchetto', 'gift', ARRAY['free_months'], NULL, NULL, 2, NULL, 30, true, true, 3),
  ('Sessione Bonus', 'Sessioni extra gratuite incluse', 'plus-circle', ARRAY['free_sessions'], NULL, NULL, NULL, 3, 60, true, true, 4),
  ('Riattivazione Atleta', 'Offerta dedicata ad atleti inattivi', 'rotate-ccw', ARRAY['percentage'], 40, NULL, NULL, NULL, 45, false, true, 5),
  ('Referral Amico', 'Sconto per atleti portati da un amico', 'users', ARRAY['percentage','fixed_amount'], 20, 30, NULL, NULL, 90, false, true, 6)
ON CONFLICT DO NOTHING;
