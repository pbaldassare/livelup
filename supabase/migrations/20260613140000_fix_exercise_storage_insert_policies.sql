-- Fix INSERT policies for exercise-images and exercise-videos to allow admins
-- Previously, only PTs with path ownership could INSERT — admins were blocked.
-- UPDATE/DELETE already have admin exceptions (migration 20260513092928); this
-- brings INSERT into parity with that pattern.

DROP POLICY IF EXISTS "PTs can upload exercise images" ON storage.objects;
CREATE POLICY "PTs can upload exercise images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'exercise-images'
  AND (
    public.is_admin(auth.uid())
    OR (public.is_pt(auth.uid()) AND (storage.foldername(name))[1] = auth.uid()::text)
  )
);

DROP POLICY IF EXISTS "PT can upload exercise videos" ON storage.objects;
CREATE POLICY "PT can upload exercise videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'exercise-videos'
  AND (
    public.is_admin(auth.uid())
    OR (public.is_pt(auth.uid()) AND (storage.foldername(name))[1] = auth.uid()::text)
  )
);
