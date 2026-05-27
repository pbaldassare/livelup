-- Fix storage INSERT policies to enforce folder ownership for PT uploads

DROP POLICY IF EXISTS "PTs can upload exercise images" ON storage.objects;
CREATE POLICY "PTs can upload exercise images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'exercise-images'
  AND is_pt(auth.uid())
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

DROP POLICY IF EXISTS "PT can upload exercise videos" ON storage.objects;
CREATE POLICY "PT can upload exercise videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'exercise-videos'
  AND is_pt(auth.uid())
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

DROP POLICY IF EXISTS "PT can upload certificates" ON storage.objects;
CREATE POLICY "PT can upload certificates"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pt-certificates'
  AND is_pt(auth.uid())
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- Add missing UPDATE policy for progress-photos (athlete owns their folder)
CREATE POLICY "Atleta can update own progress photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = (auth.uid())::text
)
WITH CHECK (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);