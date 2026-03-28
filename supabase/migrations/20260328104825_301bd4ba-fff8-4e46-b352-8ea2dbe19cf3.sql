
-- Create pt_types table
CREATE TABLE public.pt_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pt_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pt_types" ON public.pt_types FOR ALL TO public USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated can view active pt_types" ON public.pt_types FOR SELECT TO authenticated USING (is_active = true);

-- Seed initial data
INSERT INTO public.pt_types (name, sort_order) VALUES
  ('Fitness', 1), ('Calisthenics', 2), ('Yoga', 3), ('Pilates', 4),
  ('Powerlifting', 5), ('Functional Training', 6), ('CrossFit', 7),
  ('Bodybuilding', 8), ('Riabilitazione', 9), ('Sport Performance', 10);

-- Add FK column to pt_profiles
ALTER TABLE public.pt_profiles ADD COLUMN pt_type_id uuid REFERENCES public.pt_types(id);
