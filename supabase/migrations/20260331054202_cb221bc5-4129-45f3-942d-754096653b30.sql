
-- Add referred_by_pt column to atleta_profiles
ALTER TABLE public.atleta_profiles 
ADD COLUMN IF NOT EXISTS referred_by_pt uuid NULL;

-- RLS policies for PT to manage their own coupons
CREATE POLICY "PT can view own coupons"
ON public.coupons
FOR SELECT
TO authenticated
USING (
  public.is_pt(auth.uid()) AND created_by = auth.uid()
);

CREATE POLICY "PT can insert own coupons"
ON public.coupons
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_pt(auth.uid()) AND created_by = auth.uid()
);

CREATE POLICY "PT can update own coupons"
ON public.coupons
FOR UPDATE
TO authenticated
USING (
  public.is_pt(auth.uid()) AND created_by = auth.uid()
);

CREATE POLICY "PT can delete own coupons"
ON public.coupons
FOR DELETE
TO authenticated
USING (
  public.is_pt(auth.uid()) AND created_by = auth.uid()
);
