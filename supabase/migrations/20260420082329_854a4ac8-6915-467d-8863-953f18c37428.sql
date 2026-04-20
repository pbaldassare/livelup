-- Allow chat participants to view each other's profile (so atleta sees real PT name)
CREATE POLICY "Chat participants can view each other profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.chats c
    WHERE (c.pt_user_id = auth.uid() AND c.atleta_user_id = profiles.user_id)
       OR (c.atleta_user_id = auth.uid() AND c.pt_user_id = profiles.user_id)
  )
);

-- Also allow viewing connected counterpart profile (coach <-> athlete) regardless of chat
CREATE POLICY "Connected PT and Atleta can view each other profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.pt_atleta_connections con
    WHERE con.status = 'active'
      AND (
        (con.pt_user_id = auth.uid() AND con.atleta_user_id = profiles.user_id)
        OR (con.atleta_user_id = auth.uid() AND con.pt_user_id = profiles.user_id)
      )
  )
);