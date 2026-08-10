-- Idempotent: also present in 20260810134907_*; safe CREATE OR REPLACE
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(_chat_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;
  IF NOT public.is_chat_participant(v_uid, _chat_id) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  UPDATE public.messages
  SET is_read = true, read_at = now()
  WHERE chat_id = _chat_id
    AND sender_user_id <> v_uid
    AND is_read = false;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_messages_as_read(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_messages_as_read(UUID) TO authenticated;
