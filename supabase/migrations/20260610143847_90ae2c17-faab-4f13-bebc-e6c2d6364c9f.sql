
-- 1) profiles: re-add SELECT policy using can_view_profile_basic
CREATE POLICY "Users can view basic profile info of connected users"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.can_view_profile_basic(user_id));

-- 2) atleta_pt_subscriptions: allow athletes to insert their own subscriptions
CREATE POLICY "Athletes can insert own subscriptions"
ON public.atleta_pt_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = atleta_user_id AND public.is_atleta(auth.uid()));

-- 3) notifications: scope policies to authenticated
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
