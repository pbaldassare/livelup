-- =====================================================
-- Chat 1:1 anche senza connessione PT–atleta
-- L'atleta può fare domande a un Professionista attivo
-- prima (o invece) di richiedere la connessione.
-- are_connected resta solo active — workout/progress invariati.
-- =====================================================

CREATE OR REPLACE FUNCTION public.can_chat_with(_pt_user_id UUID, _atleta_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.pt_atleta_connections
      WHERE pt_user_id = _pt_user_id
        AND atleta_user_id = _atleta_user_id
        AND status IN ('active', 'pending')
    )
    OR (
      -- Inquiry: solo l'atleta apre la chat. Il PT risponde
      -- come partecipante (is_chat_participant) sulla riga esistente.
      auth.uid() = _atleta_user_id
      AND public.has_role(_pt_user_id, 'pt')
      AND public.has_role(_atleta_user_id, 'atleta')
      AND COALESCE(public.is_pt_active(_pt_user_id), false)
    );
$$;

COMMENT ON FUNCTION public.can_chat_with(uuid, uuid) IS
  'True se PT e atleta hanno connessione active/pending, oppure se l''atleta apre una chat di domanda verso un PT attivo.';

GRANT EXECUTE ON FUNCTION public.can_chat_with(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Connected users can create chat" ON public.chats;
CREATE POLICY "Connected users can create chat"
  ON public.chats FOR INSERT
  WITH CHECK (
    (auth.uid() = pt_user_id OR auth.uid() = atleta_user_id)
    AND public.can_chat_with(pt_user_id, atleta_user_id)
  );
