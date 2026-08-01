-- PT (and athlete) can view counterpart basic profile when connection is pending or active.
-- Root cause: can_view_profile_basic only allowed status = 'active', so PT Richieste
-- cards could not load athlete first_name/last_name/email and fell back to "Atleta".

CREATE OR REPLACE FUNCTION public.can_view_profile_basic(_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    auth.uid() = _target_user_id
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.pt_atleta_connections con
      WHERE con.status IN ('pending', 'active')
        AND (
          (con.pt_user_id = auth.uid() AND con.atleta_user_id = _target_user_id)
          OR
          (con.atleta_user_id = auth.uid() AND con.pt_user_id = _target_user_id)
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.chats c
      WHERE (c.pt_user_id = auth.uid() AND c.atleta_user_id = _target_user_id)
         OR (c.atleta_user_id = auth.uid() AND c.pt_user_id = _target_user_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.atleta_pt_subscriptions s
      WHERE s.pt_user_id = auth.uid()
        AND s.atleta_user_id = _target_user_id
    )
$$;

REVOKE ALL ON FUNCTION public.can_view_profile_basic(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_profile_basic(uuid) TO authenticated;

-- atleta_profiles: allow PT SELECT for pending+active without widening is_connected_to_pt
-- (that helper stays active-only for writes / sensitive data).
DROP POLICY IF EXISTS "PT can view pending or active atleta profiles" ON public.atleta_profiles;
CREATE POLICY "PT can view pending or active atleta profiles"
  ON public.atleta_profiles
  FOR SELECT
  TO authenticated
  USING (
    public.is_pt(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.pt_atleta_connections con
      WHERE con.pt_user_id = auth.uid()
        AND con.atleta_user_id = atleta_profiles.user_id
        AND con.status IN ('pending', 'active')
    )
  );
