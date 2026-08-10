-- =====================================================
-- Mark 1:1 chat messages as read (recipient side)
-- RLS only allows sender UPDATE; recipients need this RPC.
-- =====================================================

CREATE OR REPLACE FUNCTION public.mark_messages_as_read(_chat_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_count INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;

  IF _chat_id IS NULL OR NOT public.is_chat_participant(v_uid, _chat_id) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  UPDATE public.messages
  SET
    is_read = true,
    read_at = COALESCE(read_at, now())
  WHERE chat_id = _chat_id
    AND sender_user_id <> v_uid
    AND is_read = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_messages_as_read(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_messages_as_read(UUID) TO authenticated;

COMMENT ON FUNCTION public.mark_messages_as_read(UUID) IS
  'Segna come letti i messaggi ricevuti in una chat 1:1 (bypass RLS UPDATE solo-mittente).';
