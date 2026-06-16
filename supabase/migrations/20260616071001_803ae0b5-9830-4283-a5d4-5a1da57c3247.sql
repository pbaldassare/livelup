
-- 1. pt_atleta_connections INSERT: require targeted PT to actually have the 'pt' role and atleta to have 'atleta' role
DROP POLICY IF EXISTS "Users can request connections" ON public.pt_atleta_connections;
CREATE POLICY "Users can request connections"
ON public.pt_atleta_connections
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = requested_by
  AND public.is_pt(pt_user_id)
  AND public.is_atleta(atleta_user_id)
  AND (
    (auth.uid() = atleta_user_id AND public.is_atleta(auth.uid()))
    OR (auth.uid() = pt_user_id AND public.is_pt(auth.uid()))
  )
);

-- 2. atleta_pt_subscriptions: remove athlete self-INSERT (only PT/admin create subscriptions)
DROP POLICY IF EXISTS "Athletes can insert own subscriptions" ON public.atleta_pt_subscriptions;

-- 3. pt_athlete_notes: explicit DELETE policy for PT owners
DROP POLICY IF EXISTS "PT can delete own notes" ON public.pt_athlete_notes;
CREATE POLICY "PT can delete own notes"
ON public.pt_athlete_notes
FOR DELETE
TO authenticated
USING (pt_user_id = auth.uid());

-- 4. user_roles: add restrictive policies blocking non-admin writes (SECURITY DEFINER triggers bypass RLS)
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
CREATE POLICY "Only admins can update roles"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;
CREATE POLICY "Only admins can delete roles"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- 5. Storage: restrict progress photos UPDATE to authenticated users only
DROP POLICY IF EXISTS "Atleta can update own progress photos" ON storage.objects;
CREATE POLICY "Atleta can update own progress photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = (auth.uid())::text
)
WITH CHECK (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- 6. atleta_profiles.referred_by_pt: add FK to profiles(user_id) (mirrors auth.users via existing FK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'atleta_profiles_referred_by_pt_fkey'
  ) THEN
    -- Null out any orphan references first
    UPDATE public.atleta_profiles ap
    SET referred_by_pt = NULL
    WHERE referred_by_pt IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = ap.referred_by_pt);

    ALTER TABLE public.atleta_profiles
      ADD CONSTRAINT atleta_profiles_referred_by_pt_fkey
      FOREIGN KEY (referred_by_pt) REFERENCES public.profiles(user_id) ON DELETE SET NULL;
  END IF;
END $$;
