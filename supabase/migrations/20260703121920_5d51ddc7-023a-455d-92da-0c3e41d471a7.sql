CREATE POLICY "Users can upload group images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'group-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update own group images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'group-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own group images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'group-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Authenticated can read group images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'group-images');
