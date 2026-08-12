CREATE OR REPLACE FUNCTION public.can_chat_with(_pt_user_id uuid, _atleta_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pt_atleta_connections c
    WHERE c.pt_user_id = _pt_user_id
      AND c.atleta_user_id = _atleta_user_id
      AND c.status IN ('active','pending')
  )
$$;

GRANT EXECUTE ON FUNCTION public.can_chat_with(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Connected users can create chat" ON public.chats;
CREATE POLICY "Connected users can create chat"
ON public.chats
FOR INSERT
TO authenticated
WITH CHECK (
  ((auth.uid() = pt_user_id) OR (auth.uid() = atleta_user_id))
  AND public.can_chat_with(pt_user_id, atleta_user_id)
);