-- Add renewal columns to atleta_pt_subscriptions
ALTER TABLE public.atleta_pt_subscriptions
  ADD COLUMN IF NOT EXISTS renewal_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS renewal_status TEXT CHECK (renewal_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT false;