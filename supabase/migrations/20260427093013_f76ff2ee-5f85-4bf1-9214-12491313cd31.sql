-- ============================================================
-- 1. Restrict notifications INSERT to self only
-- (SECURITY DEFINER triggers bypass RLS and continue to work)
-- ============================================================
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Users can insert own notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 2. Remove cross-user profile SELECT policies that exposed
--    email and phone, and expose a safe view instead.
-- ============================================================
DROP POLICY IF EXISTS "Chat participants can view each other profile" ON public.profiles;
DROP POLICY IF EXISTS "Connected PT and Atleta can view each other profile" ON public.profiles;
DROP POLICY IF EXISTS "PT can view subscriber profiles" ON public.profiles;

-- Helper: can the current user see another user's basic (non-sensitive) profile?
CREATE OR REPLACE FUNCTION public.can_view_profile_basic(_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- self
    auth.uid() = _target_user_id
    -- admin
    OR public.is_admin(auth.uid())
    -- active connection (either direction)
    OR EXISTS (
      SELECT 1 FROM public.pt_atleta_connections con
      WHERE con.status = 'active'
        AND (
          (con.pt_user_id = auth.uid() AND con.atleta_user_id = _target_user_id)
          OR
          (con.atleta_user_id = auth.uid() AND con.pt_user_id = _target_user_id)
        )
    )
    -- chat participants
    OR EXISTS (
      SELECT 1 FROM public.chats c
      WHERE (c.pt_user_id = auth.uid() AND c.atleta_user_id = _target_user_id)
         OR (c.atleta_user_id = auth.uid() AND c.pt_user_id = _target_user_id)
    )
    -- PT viewing one of their subscribers
    OR EXISTS (
      SELECT 1 FROM public.atleta_pt_subscriptions s
      WHERE s.pt_user_id = auth.uid()
        AND s.atleta_user_id = _target_user_id
    )
$$;

REVOKE ALL ON FUNCTION public.can_view_profile_basic(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_profile_basic(uuid) TO authenticated;

-- Safe view: NEVER exposes email or phone
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.user_id,
  p.first_name,
  p.last_name,
  p.avatar_url,
  p.cover_url,
  p.created_at,
  p.updated_at
FROM public.profiles p
WHERE public.can_view_profile_basic(p.user_id);

GRANT SELECT ON public.public_profiles TO authenticated;
REVOKE ALL ON public.public_profiles FROM anon;