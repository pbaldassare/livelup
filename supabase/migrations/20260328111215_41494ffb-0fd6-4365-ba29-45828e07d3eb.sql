
-- pt_specializations catalog
CREATE TABLE public.pt_specializations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pt_specializations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage pt_specializations" ON public.pt_specializations FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Authenticated can view active pt_specializations" ON public.pt_specializations FOR SELECT TO authenticated USING (is_active = true);

-- pt_certifications catalog
CREATE TABLE public.pt_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pt_certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage pt_certifications" ON public.pt_certifications FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Authenticated can view active pt_certifications" ON public.pt_certifications FOR SELECT TO authenticated USING (is_active = true);

-- Join: PT profile specializations
CREATE TABLE public.pt_profile_specializations (
  pt_user_id uuid NOT NULL,
  specialization_id uuid NOT NULL REFERENCES public.pt_specializations(id) ON DELETE CASCADE,
  PRIMARY KEY (pt_user_id, specialization_id)
);
ALTER TABLE public.pt_profile_specializations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "PT can manage own specializations" ON public.pt_profile_specializations FOR ALL USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));
CREATE POLICY "Admins can manage all pt_profile_specializations" ON public.pt_profile_specializations FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Anyone can view pt_profile_specializations" ON public.pt_profile_specializations FOR SELECT USING (true);

-- Join: PT profile certifications
CREATE TABLE public.pt_profile_certifications (
  pt_user_id uuid NOT NULL,
  certification_id uuid NOT NULL REFERENCES public.pt_certifications(id) ON DELETE CASCADE,
  PRIMARY KEY (pt_user_id, certification_id)
);
ALTER TABLE public.pt_profile_certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "PT can manage own certifications" ON public.pt_profile_certifications FOR ALL USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));
CREATE POLICY "Admins can manage all pt_profile_certifications" ON public.pt_profile_certifications FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Anyone can view pt_profile_certifications" ON public.pt_profile_certifications FOR SELECT USING (true);

-- PT certificates (uploaded documents)
CREATE TABLE public.pt_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_user_id uuid NOT NULL,
  name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pt_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "PT can manage own certificates" ON public.pt_certificates FOR ALL USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));
CREATE POLICY "Admins can view all certificates" ON public.pt_certificates FOR SELECT USING (public.is_admin(auth.uid()));

-- Category suggestions from PT to admin
CREATE TYPE public.suggestion_type AS ENUM ('specialization', 'certification');
CREATE TYPE public.suggestion_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.pt_category_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_user_id uuid NOT NULL,
  type public.suggestion_type NOT NULL,
  name text NOT NULL,
  status public.suggestion_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pt_category_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "PT can insert suggestions" ON public.pt_category_suggestions FOR INSERT WITH CHECK (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));
CREATE POLICY "PT can view own suggestions" ON public.pt_category_suggestions FOR SELECT USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));
CREATE POLICY "Admins can manage all suggestions" ON public.pt_category_suggestions FOR ALL USING (public.is_admin(auth.uid()));

-- Storage bucket for certificates
INSERT INTO storage.buckets (id, name, public) VALUES ('pt-certificates', 'pt-certificates', true);

-- Storage RLS
CREATE POLICY "PT can upload certificates" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'pt-certificates' AND public.is_pt(auth.uid()));
CREATE POLICY "PT can delete own certificates" ON storage.objects FOR DELETE USING (bucket_id = 'pt-certificates' AND public.is_pt(auth.uid()));
CREATE POLICY "Anyone can view certificates" ON storage.objects FOR SELECT USING (bucket_id = 'pt-certificates');

-- Seed specializations
INSERT INTO public.pt_specializations (name, sort_order) VALUES
  ('Bodybuilding', 1), ('Calisthenics', 2), ('Yoga', 3), ('Pilates', 4),
  ('Functional Training', 5), ('HIIT', 6), ('Powerlifting', 7),
  ('Riabilitazione', 8), ('Sport Performance', 9), ('Dimagrimento', 10);

-- Seed certifications
INSERT INTO public.pt_certifications (name, sort_order) VALUES
  ('CONI', 1), ('FIF', 2), ('ACSM', 3), ('NASM', 4),
  ('ISSA', 5), ('ACE', 6), ('NSCA', 7), ('CSEN', 8);
