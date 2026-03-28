-- Add cover_image_url to calendar_events
ALTER TABLE public.calendar_events ADD COLUMN cover_image_url text;

-- Create event-covers storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('event-covers', 'event-covers', true);

-- RLS: authenticated users can upload to their own folder
CREATE POLICY "Users can upload event covers" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-covers' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: authenticated users can update their own files
CREATE POLICY "Users can update own event covers" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'event-covers' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: authenticated users can delete their own files
CREATE POLICY "Users can delete own event covers" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'event-covers' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: anyone can read event covers (public bucket)
CREATE POLICY "Anyone can read event covers" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-covers');