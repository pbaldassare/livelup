-- Re-apply table policies (idempotent)
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can insert own audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert own audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can insert 404 logs" ON public.app_404_logs;
DROP POLICY IF EXISTS "Authenticated users can insert 404 logs" ON public.app_404_logs;
CREATE POLICY "Authenticated users can insert 404 logs"
  ON public.app_404_logs FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can view event participants" ON public.event_participants;
DROP POLICY IF EXISTS "View participants of public or own events" ON public.event_participants;
CREATE POLICY "View participants of public or own events"
  ON public.event_participants FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.calendar_events ce
      WHERE ce.id = event_participants.event_id
        AND (ce.is_public = true OR ce.creator_user_id = auth.uid())
    )
  );

-- Storage policies: replace with ownership-scoped versions
DROP POLICY IF EXISTS "PTs can update exercise images" ON storage.objects;
DROP POLICY IF EXISTS "PTs can delete exercise images" ON storage.objects;
CREATE POLICY "PTs can update own exercise images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'exercise-images'
    AND (
      public.is_admin(auth.uid())
      OR (public.is_pt(auth.uid()) AND (storage.foldername(name))[1] = auth.uid()::text)
    )
  );
CREATE POLICY "PTs can delete own exercise images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'exercise-images'
    AND (
      public.is_admin(auth.uid())
      OR (public.is_pt(auth.uid()) AND (storage.foldername(name))[1] = auth.uid()::text)
    )
  );

DROP POLICY IF EXISTS "PT can update own exercise videos" ON storage.objects;
DROP POLICY IF EXISTS "PT can delete own exercise videos" ON storage.objects;
CREATE POLICY "PT can update own exercise videos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'exercise-videos'
    AND (
      public.is_admin(auth.uid())
      OR (public.is_pt(auth.uid()) AND (storage.foldername(name))[1] = auth.uid()::text)
    )
  );
CREATE POLICY "PT can delete own exercise videos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'exercise-videos'
    AND (
      public.is_admin(auth.uid())
      OR (public.is_pt(auth.uid()) AND (storage.foldername(name))[1] = auth.uid()::text)
    )
  );

DROP POLICY IF EXISTS "PT can delete own certificates" ON storage.objects;
CREATE POLICY "PT can delete own certificates"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'pt-certificates'
    AND (
      public.is_admin(auth.uid())
      OR (public.is_pt(auth.uid()) AND (storage.foldername(name))[1] = auth.uid()::text)
    )
  );