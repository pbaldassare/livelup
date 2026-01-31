-- Tabella per professionisti (Nutrizionisti, Fisioterapisti, etc.)
CREATE TABLE public.professional_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  profession_type TEXT NOT NULL CHECK (profession_type IN ('nutrizionista', 'fisioterapista')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  bio TEXT,
  specializations TEXT[] DEFAULT '{}',
  hourly_rate DECIMAL(10,2),
  currency TEXT DEFAULT 'EUR',
  rating_avg DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  offers_online BOOLEAN DEFAULT false,
  offers_in_person BOOLEAN DEFAULT true,
  location_city TEXT,
  location_lat DECIMAL(10,7),
  location_lng DECIMAL(10,7),
  experience_years INTEGER DEFAULT 0,
  is_discoverable BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'attivo',
  certifications TEXT[] DEFAULT '{}',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view discoverable professional profiles"
ON public.professional_profiles
FOR SELECT
USING (is_discoverable = true AND status = 'attivo');

CREATE POLICY "Admins can manage all professional profiles"
ON public.professional_profiles
FOR ALL
USING (is_admin(auth.uid()));

-- Index for faster queries
CREATE INDEX idx_professional_profiles_profession_type ON public.professional_profiles(profession_type);
CREATE INDEX idx_professional_profiles_location_city ON public.professional_profiles(location_city);
CREATE INDEX idx_professional_profiles_discoverable ON public.professional_profiles(is_discoverable, status);

-- Trigger for updated_at
CREATE TRIGGER update_professional_profiles_updated_at
BEFORE UPDATE ON public.professional_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();