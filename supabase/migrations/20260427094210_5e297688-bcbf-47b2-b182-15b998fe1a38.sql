
-- 1. Tighten exercise-images storage policies
DROP POLICY IF EXISTS "Authenticated users can upload exercise images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update exercise images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete exercise images" ON storage.objects;

CREATE POLICY "PTs can upload exercise images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exercise-images'
  AND public.is_pt(auth.uid())
);

CREATE POLICY "PTs can update exercise images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'exercise-images'
  AND public.is_pt(auth.uid())
);

CREATE POLICY "PTs can delete exercise images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'exercise-images'
  AND public.is_pt(auth.uid())
);

-- 2. Remove push_subscriptions from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.push_subscriptions;
