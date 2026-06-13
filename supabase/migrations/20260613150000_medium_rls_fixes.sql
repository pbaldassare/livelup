-- Medium-severity RLS fixes (M1–M5) from security audit

-- =====================================================
-- M1: professional_profiles — allow self-management
-- Professionals had no INSERT/UPDATE policy for their own row.
-- Existing policies: public SELECT (discoverable only) + admin ALL.
-- =====================================================
DROP POLICY IF EXISTS "Professionals can manage own profile" ON public.professional_profiles;
CREATE POLICY "Professionals can manage own profile"
ON public.professional_profiles FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- M2: admin_broadcast_recipients — allow users to mark as read
-- Existing policies: admin ALL + user SELECT. No user UPDATE.
-- =====================================================
DROP POLICY IF EXISTS "Users can mark own broadcast as read" ON public.admin_broadcast_recipients;
CREATE POLICY "Users can mark own broadcast as read"
ON public.admin_broadcast_recipients FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- M3: pt_content_library — revoke access when connection ends
-- Old policy allowed shared athletes to read even after disconnection.
-- New policy adds are_connected() check for non-public content.
-- =====================================================
DROP POLICY IF EXISTS "Atleti can view shared content" ON public.pt_content_library;
CREATE POLICY "Atleti can view shared content"
ON public.pt_content_library FOR SELECT
TO authenticated
USING (
  public.is_atleta(auth.uid())
  AND (
    is_public = true
    OR (
      auth.uid() = ANY(shared_with_athletes)
      AND public.are_connected(pt_user_id, auth.uid())
    )
  )
);

-- =====================================================
-- M4: pt-certificates storage — allow in-place UPDATE
-- INSERT and DELETE already exist; UPDATE was missing.
-- Pattern matches existing DELETE policy for this bucket.
-- =====================================================
DROP POLICY IF EXISTS "PT can update own certificates" ON storage.objects;
CREATE POLICY "PT can update own certificates"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pt-certificates'
  AND (
    public.is_admin(auth.uid())
    OR (public.is_pt(auth.uid()) AND (storage.foldername(name))[1] = auth.uid()::text)
  )
)
WITH CHECK (
  bucket_id = 'pt-certificates'
  AND (
    public.is_admin(auth.uid())
    OR (public.is_pt(auth.uid()) AND (storage.foldername(name))[1] = auth.uid()::text)
  )
);

-- =====================================================
-- M5: cheers — allow users to delete their own sent cheers
-- Existing: admin ALL + user INSERT + user SELECT.
-- Regular users could not retract a cheer they sent.
-- =====================================================
DROP POLICY IF EXISTS "Users can delete own sent cheers" ON public.cheers;
CREATE POLICY "Users can delete own sent cheers"
ON public.cheers FOR DELETE
TO authenticated
USING (auth.uid() = sender_user_id);
