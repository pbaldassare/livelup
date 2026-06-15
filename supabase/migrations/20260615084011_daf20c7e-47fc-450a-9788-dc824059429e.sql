
-- Allow PTs to create their own coupon templates alongside admin globals
ALTER TABLE public.coupon_templates
  ADD COLUMN IF NOT EXISTS pt_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_coupon_templates_pt_user ON public.coupon_templates(pt_user_id);

-- Replace SELECT policy: anyone authenticated sees active global (pt_user_id IS NULL) + PT sees own + admin all
DROP POLICY IF EXISTS "Authenticated users can read active templates" ON public.coupon_templates;
CREATE POLICY "Read templates: globals + own + admin"
  ON public.coupon_templates
  FOR SELECT
  TO authenticated
  USING (
    (is_active = true AND pt_user_id IS NULL)
    OR pt_user_id = auth.uid()
    OR public.is_admin(auth.uid())
  );

-- PTs can manage their own templates (admins keep their full policy)
CREATE POLICY "PTs manage own templates"
  ON public.coupon_templates
  FOR ALL
  TO authenticated
  USING (pt_user_id = auth.uid() AND public.has_role(auth.uid(), 'pt'))
  WITH CHECK (pt_user_id = auth.uid() AND public.has_role(auth.uid(), 'pt'));
