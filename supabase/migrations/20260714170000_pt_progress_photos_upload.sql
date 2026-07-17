-- PT can upload progress photos for connected athletes
DROP POLICY IF EXISTS "PT can insert connected atleta progress photos" ON public.progress_photos;
CREATE POLICY "PT can insert connected atleta progress photos"
  ON public.progress_photos FOR INSERT TO authenticated
  WITH CHECK (
    public.is_pt(auth.uid())
    AND public.is_connected_to_pt(atleta_user_id, auth.uid())
  );

DROP POLICY IF EXISTS "PT can upload connected atleta progress photos" ON storage.objects;
CREATE POLICY "PT can upload connected atleta progress photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'progress-photos'
    AND public.is_pt(auth.uid())
    AND public.is_connected_to_pt((storage.foldername(name))[1]::uuid, auth.uid())
  );
