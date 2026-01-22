-- =====================================================
-- BLOCCO 1: FONDAZIONI PIATTAFORMA FITNESS ENTERPRISE
-- Sistema Ruoli e Permessi
-- =====================================================

-- 1. Enum per i ruoli (SOLO 3 ruoli, mai mescolare)
CREATE TYPE public.app_role AS ENUM ('admin', 'pt', 'atleta');

-- 2. Enum per stati PT
CREATE TYPE public.pt_status AS ENUM (
  'registrato',
  'in_attesa_approvazione', 
  'attivo',
  'sospeso',
  'premium'
);

-- 3. Enum per stati Atleta
CREATE TYPE public.atleta_status AS ENUM (
  'non_collegato',
  'collegato',
  'premium'
);

-- 4. Tabella ruoli utente (separata come da requisiti sicurezza)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 5. Tabella profili base
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Tabella profili PT (estensione)
CREATE TABLE public.pt_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  status pt_status NOT NULL DEFAULT 'registrato',
  bio TEXT,
  specializations TEXT[],
  certifications TEXT[],
  experience_years INTEGER DEFAULT 0,
  hourly_rate DECIMAL(10,2),
  currency TEXT DEFAULT 'EUR',
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),
  location_city TEXT,
  location_country TEXT,
  offers_online BOOLEAN DEFAULT true,
  offers_in_person BOOLEAN DEFAULT true,
  max_athletes INTEGER DEFAULT 50,
  is_discoverable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Tabella profili Atleta (estensione)
CREATE TABLE public.atleta_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  status atleta_status NOT NULL DEFAULT 'non_collegato',
  fitness_level TEXT,
  goals TEXT[],
  injuries TEXT[],
  date_of_birth DATE,
  height_cm INTEGER,
  weight_kg DECIMAL(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Tabella relazione PT-Atleta
CREATE TABLE public.pt_atleta_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  atleta_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, terminated
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  terminated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pt_user_id, atleta_user_id)
);

-- 9. Tabella permessi (per espansione futura)
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, resource, action)
);

-- 10. Tabella audit log (per sicurezza)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT,
  resource_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- FUNZIONI SECURITY DEFINER PER CONTROLLO RUOLI
-- =====================================================

-- Funzione per verificare ruolo utente (evita recursion RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Funzione per ottenere ruolo utente
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Funzione per verificare se è admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Funzione per verificare se è PT
CREATE OR REPLACE FUNCTION public.is_pt(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'pt')
$$;

-- Funzione per verificare se è Atleta
CREATE OR REPLACE FUNCTION public.is_atleta(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'atleta')
$$;

-- Funzione per verificare connessione PT-Atleta
CREATE OR REPLACE FUNCTION public.is_connected_to_pt(_atleta_user_id UUID, _pt_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pt_atleta_connections
    WHERE atleta_user_id = _atleta_user_id
      AND pt_user_id = _pt_user_id
      AND status = 'active'
  )
$$;

-- =====================================================
-- TRIGGER PER AGGIORNAMENTO TIMESTAMP
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pt_profiles_updated_at
  BEFORE UPDATE ON public.pt_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_atleta_profiles_updated_at
  BEFORE UPDATE ON public.atleta_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pt_atleta_connections_updated_at
  BEFORE UPDATE ON public.pt_atleta_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atleta_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_atleta_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- POLICIES: user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.is_admin(auth.uid()));

-- POLICIES: profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  USING (public.is_admin(auth.uid()));

-- POLICIES: pt_profiles
CREATE POLICY "PT can view own profile"
  ON public.pt_profiles FOR SELECT
  USING (auth.uid() = user_id AND public.is_pt(auth.uid()));

CREATE POLICY "Atleta can view discoverable PT profiles"
  ON public.pt_profiles FOR SELECT
  USING (is_discoverable = true AND public.is_atleta(auth.uid()));

CREATE POLICY "Admins can view all PT profiles"
  ON public.pt_profiles FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "PT can update own profile"
  ON public.pt_profiles FOR UPDATE
  USING (auth.uid() = user_id AND public.is_pt(auth.uid()));

CREATE POLICY "PT can insert own profile"
  ON public.pt_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_pt(auth.uid()));

CREATE POLICY "Admins can manage all PT profiles"
  ON public.pt_profiles FOR ALL
  USING (public.is_admin(auth.uid()));

-- POLICIES: atleta_profiles
CREATE POLICY "Atleta can view own profile"
  ON public.atleta_profiles FOR SELECT
  USING (auth.uid() = user_id AND public.is_atleta(auth.uid()));

CREATE POLICY "PT can view connected atleta profiles"
  ON public.atleta_profiles FOR SELECT
  USING (
    public.is_pt(auth.uid()) 
    AND public.is_connected_to_pt(user_id, auth.uid())
  );

CREATE POLICY "Admins can view all atleta profiles"
  ON public.atleta_profiles FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Atleta can update own profile"
  ON public.atleta_profiles FOR UPDATE
  USING (auth.uid() = user_id AND public.is_atleta(auth.uid()));

CREATE POLICY "Atleta can insert own profile"
  ON public.atleta_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_atleta(auth.uid()));

CREATE POLICY "Admins can manage all atleta profiles"
  ON public.atleta_profiles FOR ALL
  USING (public.is_admin(auth.uid()));

-- POLICIES: pt_atleta_connections
CREATE POLICY "PT can view their connections"
  ON public.pt_atleta_connections FOR SELECT
  USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

CREATE POLICY "Atleta can view their connections"
  ON public.pt_atleta_connections FOR SELECT
  USING (auth.uid() = atleta_user_id AND public.is_atleta(auth.uid()));

CREATE POLICY "Admins can view all connections"
  ON public.pt_atleta_connections FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can request connections"
  ON public.pt_atleta_connections FOR INSERT
  WITH CHECK (
    auth.uid() = requested_by
    AND (
      (auth.uid() = atleta_user_id AND public.is_atleta(auth.uid()))
      OR (auth.uid() = pt_user_id AND public.is_pt(auth.uid()))
    )
  );

CREATE POLICY "PT can update their connections"
  ON public.pt_atleta_connections FOR UPDATE
  USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

CREATE POLICY "Admins can manage all connections"
  ON public.pt_atleta_connections FOR ALL
  USING (public.is_admin(auth.uid()));

-- POLICIES: permissions
CREATE POLICY "Anyone can view permissions"
  ON public.permissions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage permissions"
  ON public.permissions FOR ALL
  USING (public.is_admin(auth.uid()));

-- POLICIES: audit_logs
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view their own audit logs"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- INDICI PER PERFORMANCE
-- =====================================================

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_pt_profiles_user_id ON public.pt_profiles(user_id);
CREATE INDEX idx_pt_profiles_status ON public.pt_profiles(status);
CREATE INDEX idx_pt_profiles_discoverable ON public.pt_profiles(is_discoverable);
CREATE INDEX idx_atleta_profiles_user_id ON public.atleta_profiles(user_id);
CREATE INDEX idx_atleta_profiles_status ON public.atleta_profiles(status);
CREATE INDEX idx_pt_atleta_connections_pt ON public.pt_atleta_connections(pt_user_id);
CREATE INDEX idx_pt_atleta_connections_atleta ON public.pt_atleta_connections(atleta_user_id);
CREATE INDEX idx_pt_atleta_connections_status ON public.pt_atleta_connections(status);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

-- =====================================================
-- PERMESSI BASE (seed data)
-- =====================================================

-- Admin permissions
INSERT INTO public.permissions (role, resource, action, allowed) VALUES
  ('admin', 'dashboard_admin', 'access', true),
  ('admin', 'dashboard_pt', 'access', false),
  ('admin', 'app_pt', 'access', false),
  ('admin', 'app_atleta', 'access', false),
  ('admin', 'users', 'manage', true),
  ('admin', 'roles', 'manage', true),
  ('admin', 'system', 'configure', true);

-- PT permissions  
INSERT INTO public.permissions (role, resource, action, allowed) VALUES
  ('pt', 'dashboard_admin', 'access', false),
  ('pt', 'dashboard_pt', 'access', true),
  ('pt', 'app_pt', 'access', true),
  ('pt', 'app_atleta', 'access', false),
  ('pt', 'atleti', 'manage', true),
  ('pt', 'workouts', 'manage', true),
  ('pt', 'schedule', 'manage', true);

-- Atleta permissions
INSERT INTO public.permissions (role, resource, action, allowed) VALUES
  ('atleta', 'dashboard_admin', 'access', false),
  ('atleta', 'dashboard_pt', 'access', false),
  ('atleta', 'app_pt', 'access', false),
  ('atleta', 'app_atleta', 'access', true),
  ('atleta', 'workouts', 'view', true),
  ('atleta', 'progress', 'manage', true),
  ('atleta', 'pt_discovery', 'access', true);