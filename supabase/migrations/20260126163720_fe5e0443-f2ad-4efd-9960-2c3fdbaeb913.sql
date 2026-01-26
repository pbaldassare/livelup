-- Create enum for package types
CREATE TYPE public.package_type AS ENUM ('sessioni', 'mensile', 'trimestrale', 'semestrale', 'annuale', 'custom');

-- Create enum for PT subscription status
CREATE TYPE public.pt_subscription_status AS ENUM ('attivo', 'completato', 'scaduto', 'cancellato');

-- Create pt_packages table for PT custom packages
CREATE TABLE public.pt_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_user_id UUID NOT NULL,
  
  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  package_type public.package_type NOT NULL,
  
  -- Pricing
  price DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  
  -- For session-based packages
  sessions_count INTEGER,
  
  -- For time-based subscriptions
  duration_days INTEGER,
  
  -- Features and limits
  includes_chat BOOLEAN DEFAULT true,
  includes_video_calls BOOLEAN DEFAULT false,
  max_workouts_per_week INTEGER,
  
  -- Visibility
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  
  -- Metadata
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create atleta_pt_subscriptions table
CREATE TABLE public.atleta_pt_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_user_id UUID NOT NULL,
  pt_user_id UUID NOT NULL,
  package_id UUID REFERENCES public.pt_packages(id) ON DELETE SET NULL,
  
  -- Status
  status public.pt_subscription_status NOT NULL DEFAULT 'attivo',
  
  -- For session-based packages
  sessions_total INTEGER,
  sessions_used INTEGER DEFAULT 0,
  
  -- For time-based subscriptions
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  
  -- Pricing info (snapshot at purchase time)
  price_paid DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on pt_packages
ALTER TABLE public.pt_packages ENABLE ROW LEVEL SECURITY;

-- PT can manage own packages
CREATE POLICY "PT can manage own packages"
  ON public.pt_packages FOR ALL
  USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

-- Connected atleti can view PT packages
CREATE POLICY "Connected atleti can view PT packages"
  ON public.pt_packages FOR SELECT
  USING (public.is_atleta(auth.uid()) AND public.are_connected(pt_user_id, auth.uid()) AND is_active = true);

-- Admin can view all packages
CREATE POLICY "Admins can view all packages"
  ON public.pt_packages FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admin can manage all packages
CREATE POLICY "Admins can manage all packages"
  ON public.pt_packages FOR ALL
  USING (public.is_admin(auth.uid()));

-- Enable RLS on atleta_pt_subscriptions
ALTER TABLE public.atleta_pt_subscriptions ENABLE ROW LEVEL SECURITY;

-- Atleta can view own subscriptions
CREATE POLICY "Atleta can view own subscriptions"
  ON public.atleta_pt_subscriptions FOR SELECT
  USING (auth.uid() = atleta_user_id AND public.is_atleta(auth.uid()));

-- PT can view and manage subscriptions of their athletes
CREATE POLICY "PT can view and manage subscriptions"
  ON public.atleta_pt_subscriptions FOR ALL
  USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

-- Admin can manage all subscriptions
CREATE POLICY "Admins can manage all subscriptions"
  ON public.atleta_pt_subscriptions FOR ALL
  USING (public.is_admin(auth.uid()));

-- Add triggers for updated_at
CREATE TRIGGER update_pt_packages_updated_at
  BEFORE UPDATE ON public.pt_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_atleta_pt_subscriptions_updated_at
  BEFORE UPDATE ON public.atleta_pt_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate sessions remaining
CREATE OR REPLACE FUNCTION public.get_sessions_remaining(_subscription_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(sessions_total - sessions_used, 0)
  FROM public.atleta_pt_subscriptions
  WHERE id = _subscription_id
$$;