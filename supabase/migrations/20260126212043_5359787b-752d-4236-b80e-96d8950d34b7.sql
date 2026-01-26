-- Bucket per cover images profilo
INSERT INTO storage.buckets (id, name, public)
VALUES ('cover-images', 'cover-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: upload propria cartella
CREATE POLICY "Users can upload own cover"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'cover-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: update propri file
CREATE POLICY "Users can update own cover"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'cover-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: delete propri file  
CREATE POLICY "Users can delete own cover"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'cover-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: lettura pubblica
CREATE POLICY "Public cover access"
ON storage.objects FOR SELECT
USING (bucket_id = 'cover-images');

-- Aggiungere colonna cover_url alla tabella profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cover_url TEXT;