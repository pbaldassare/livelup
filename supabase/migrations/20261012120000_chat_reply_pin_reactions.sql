-- Chat 1:1 e gruppi: reply, pin, reazioni emoji
-- GRANT + RLS su tabella nuova; pin via RPC (UPDATE messages è solo del mittente)

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_messages_pinned ON public.messages(chat_id, is_pinned) WHERE is_pinned;
CREATE INDEX IF NOT EXISTS idx_messages_group_pinned ON public.messages(chat_group_id, is_pinned) WHERE is_pinned;

CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_reactions_emoji_len CHECK (char_length(emoji) BETWEEN 1 AND 8),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON public.message_reactions(message_id);

GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_message(_message_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = _message_id
      AND (
        (m.chat_id IS NOT NULL AND public.is_chat_participant(auth.uid(), m.chat_id))
        OR (m.chat_group_id IS NOT NULL AND public.is_chat_group_participant(m.chat_group_id, auth.uid()))
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_message(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_message(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "message_reactions_select" ON public.message_reactions;
CREATE POLICY "message_reactions_select"
  ON public.message_reactions FOR SELECT TO authenticated
  USING (public.can_access_message(message_id));

DROP POLICY IF EXISTS "message_reactions_insert" ON public.message_reactions;
CREATE POLICY "message_reactions_insert"
  ON public.message_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_access_message(message_id));

DROP POLICY IF EXISTS "message_reactions_delete" ON public.message_reactions;
CREATE POLICY "message_reactions_delete"
  ON public.message_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_message_pinned(_message_id uuid, _pinned boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_access_message(_message_id) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  UPDATE public.messages SET is_pinned = _pinned WHERE id = _message_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_message_pinned(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_message_pinned(uuid, boolean) TO authenticated;

DO $$
BEGIN
  PERFORM 1 FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'message_reactions';
  IF NOT FOUND THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
  END IF;
END $$;
