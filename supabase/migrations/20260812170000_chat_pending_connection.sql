-- =====================================================
-- Chat consentita anche con richiesta di connessione pending
-- (are_connected resta solo active — workout/progress non cambiano)
-- =====================================================

CREATE OR REPLACE FUNCTION public.can_chat_with(_pt_user_id UUID, _atleta_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pt_atleta_connections
    WHERE pt_user_id = _pt_user_id
      AND atleta_user_id = _atleta_user_id
      AND status IN ('active', 'pending')
  );
$$;

COMMENT ON FUNCTION public.can_chat_with(uuid, uuid) IS
  'True se PT e atleta hanno connessione active o pending — usata per creare/usare chat prima dell''accettazione.';

GRANT EXECUTE ON FUNCTION public.can_chat_with(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Connected users can create chat" ON public.chats;
CREATE POLICY "Connected users can create chat"
  ON public.chats FOR INSERT
  WITH CHECK (
    (auth.uid() = pt_user_id OR auth.uid() = atleta_user_id)
    AND public.can_chat_with(pt_user_id, atleta_user_id)
  );
