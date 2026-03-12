-- 1. Platform settings table
CREATE TABLE public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage platform settings"
  ON public.platform_settings FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 2. Progress photos table
CREATE TABLE public.progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_user_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'fronte',
  notes TEXT,
  taken_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Atleta can manage own progress photos"
  ON public.progress_photos FOR ALL
  TO authenticated
  USING (auth.uid() = atleta_user_id AND is_atleta(auth.uid()))
  WITH CHECK (auth.uid() = atleta_user_id AND is_atleta(auth.uid()));

CREATE POLICY "PT can view connected atleta photos"
  ON public.progress_photos FOR SELECT
  TO authenticated
  USING (is_pt(auth.uid()) AND is_connected_to_pt(atleta_user_id, auth.uid()));

-- 3. Progress photos storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('progress-photos', 'progress-photos', false);

CREATE POLICY "Atleta can upload own progress photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Atleta can view own progress photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Atleta can delete own progress photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "PT can view connected atleta progress photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'progress-photos' AND is_pt(auth.uid()) AND is_connected_to_pt((storage.foldername(name))[1]::uuid, auth.uid()));