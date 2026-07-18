-- PT Chat: gruppi atleti + allegati media (immagini/video) in tutte le chat
-- Copia su Lovable Cloud SQL editor se la migration non è ancora applicata.
-- (contenuto identico a supabase/migrations/20260718170000_pt_chat_groups_and_attachments.sql)

-- -----------------------------------------------------
-- TABELLE: gruppi chat PT
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pt_chat_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pt_chat_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.pt_chat_groups(id) ON DELETE CASCADE,
  atleta_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, atleta_user_id)
);

-- Traccia l'ultima lettura per utente/gruppo (badge "non letti" per gruppo)
CREATE TABLE IF NOT EXISTS public.pt_chat_group_reads (
  group_id UUID NOT NULL REFERENCES public.pt_chat_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pt_chat_groups_pt ON public.pt_chat_groups(pt_user_id);
CREATE INDEX IF NOT EXISTS idx_pt_chat_group_members_group ON public.pt_chat_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_pt_chat_group_members_athlete ON public.pt_chat_group_members(atleta_user_id);

-- -----------------------------------------------------
-- MESSAGES: supporto messaggi di gruppo + allegati (colonne già esistenti)
-- -----------------------------------------------------

ALTER TABLE public.messages ALTER COLUMN chat_id DROP NOT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS chat_group_id UUID REFERENCES public.pt_chat_groups(id) ON DELETE CASCADE;

DO $$
BEGIN
  ALTER TABLE public.messages
    ADD CONSTRAINT messages_target_check CHECK (
      (chat_id IS NOT NULL AND chat_group_id IS NULL)
      OR (chat_id IS NULL AND chat_group_id IS NOT NULL)
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_chat_group ON public.messages(chat_group_id);

-- -----------------------------------------------------
-- HELPER FUNCTIONS (SECURITY DEFINER)
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_chat_group_participant(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pt_chat_groups g
    WHERE g.id = _group_id AND g.pt_user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.pt_chat_group_members m
    WHERE m.group_id = _group_id AND m.atleta_user_id = _user_id
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_chat_group_participant(UUID, UUID) TO authenticated;

-- -----------------------------------------------------
-- TRIGGERS: updated_at + last_message / notifiche (estese per i gruppi)
-- -----------------------------------------------------

DROP TRIGGER IF EXISTS update_pt_chat_groups_updated_at ON public.pt_chat_groups;
CREATE TRIGGER update_pt_chat_groups_updated_at
  BEFORE UPDATE ON public.pt_chat_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Estende la funzione esistente per gestire anche i messaggi di gruppo (chat_id NULL)
CREATE OR REPLACE FUNCTION public.update_chat_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.chat_id IS NOT NULL THEN
    UPDATE public.chats
    SET
      last_message_at = NEW.created_at,
      updated_at = now()
    WHERE id = NEW.chat_id;
  ELSIF NEW.chat_group_id IS NOT NULL THEN
    UPDATE public.pt_chat_groups
    SET updated_at = now()
    WHERE id = NEW.chat_group_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Estende la funzione esistente per notificare tutti i membri di un gruppo
CREATE OR REPLACE FUNCTION public.create_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id UUID;
  chat_record RECORD;
  group_record RECORD;
  member RECORD;
  notif_body TEXT;
BEGIN
  notif_body := COALESCE(
    NEW.content,
    CASE
      WHEN NEW.attachment_type = 'video' THEN 'Ha inviato un video'
      WHEN NEW.attachment_type = 'image' THEN 'Ha inviato una foto'
      ELSE 'Nuovo messaggio'
    END
  );

  IF NEW.chat_id IS NOT NULL THEN
    SELECT * INTO chat_record FROM public.chats WHERE id = NEW.chat_id;
    IF chat_record.id IS NULL THEN
      RETURN NEW;
    END IF;

    IF NEW.sender_user_id = chat_record.pt_user_id THEN
      recipient_id := chat_record.atleta_user_id;
    ELSE
      recipient_id := chat_record.pt_user_id;
    END IF;

    INSERT INTO public.notifications (user_id, type, title, body, data, action_url)
    VALUES (
      recipient_id,
      'message',
      'Nuovo messaggio',
      LEFT(notif_body, 100),
      jsonb_build_object('chat_id', NEW.chat_id, 'message_id', NEW.id),
      '/messages/' || NEW.chat_id::TEXT
    );
  ELSIF NEW.chat_group_id IS NOT NULL THEN
    SELECT * INTO group_record FROM public.pt_chat_groups WHERE id = NEW.chat_group_id;
    IF group_record.id IS NULL THEN
      RETURN NEW;
    END IF;

    IF NEW.sender_user_id <> group_record.pt_user_id THEN
      INSERT INTO public.notifications (user_id, type, title, body, data, action_url)
      VALUES (
        group_record.pt_user_id,
        'message',
        'Nuovo messaggio nel gruppo ' || group_record.name,
        LEFT(notif_body, 100),
        jsonb_build_object('chat_group_id', NEW.chat_group_id, 'message_id', NEW.id),
        '/pt/app/chat/group/' || NEW.chat_group_id::TEXT
      );
    END IF;

    FOR member IN
      SELECT atleta_user_id FROM public.pt_chat_group_members
      WHERE group_id = NEW.chat_group_id AND atleta_user_id <> NEW.sender_user_id
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body, data, action_url)
      VALUES (
        member.atleta_user_id,
        'message',
        'Nuovo messaggio nel gruppo ' || group_record.name,
        LEFT(notif_body, 100),
        jsonb_build_object('chat_group_id', NEW.chat_group_id, 'message_id', NEW.id),
        '/app/chat/group/' || NEW.chat_group_id::TEXT
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------
-- RLS: pt_chat_groups / pt_chat_group_members / pt_chat_group_reads
-- -----------------------------------------------------

ALTER TABLE public.pt_chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_chat_group_reads ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pt_chat_groups TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.pt_chat_group_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pt_chat_group_reads TO authenticated;

DROP POLICY IF EXISTS "pt_chat_groups_select" ON public.pt_chat_groups;
CREATE POLICY "pt_chat_groups_select"
  ON public.pt_chat_groups FOR SELECT TO authenticated
  USING (public.is_chat_group_participant(id, auth.uid()));

DROP POLICY IF EXISTS "pt_chat_groups_admin_select" ON public.pt_chat_groups;
CREATE POLICY "pt_chat_groups_admin_select"
  ON public.pt_chat_groups FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "pt_chat_groups_insert" ON public.pt_chat_groups;
CREATE POLICY "pt_chat_groups_insert"
  ON public.pt_chat_groups FOR INSERT TO authenticated
  WITH CHECK (pt_user_id = auth.uid() AND public.is_pt(auth.uid()));

DROP POLICY IF EXISTS "pt_chat_groups_update" ON public.pt_chat_groups;
CREATE POLICY "pt_chat_groups_update"
  ON public.pt_chat_groups FOR UPDATE TO authenticated
  USING (pt_user_id = auth.uid())
  WITH CHECK (pt_user_id = auth.uid());

DROP POLICY IF EXISTS "pt_chat_groups_delete" ON public.pt_chat_groups;
CREATE POLICY "pt_chat_groups_delete"
  ON public.pt_chat_groups FOR DELETE TO authenticated
  USING (pt_user_id = auth.uid());

DROP POLICY IF EXISTS "pt_chat_group_members_select" ON public.pt_chat_group_members;
CREATE POLICY "pt_chat_group_members_select"
  ON public.pt_chat_group_members FOR SELECT TO authenticated
  USING (
    public.is_chat_group_participant(group_id, auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "pt_chat_group_members_insert" ON public.pt_chat_group_members;
CREATE POLICY "pt_chat_group_members_insert"
  ON public.pt_chat_group_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pt_chat_groups g
      WHERE g.id = group_id AND g.pt_user_id = auth.uid()
    )
    AND public.are_connected(auth.uid(), atleta_user_id)
  );

DROP POLICY IF EXISTS "pt_chat_group_members_delete" ON public.pt_chat_group_members;
CREATE POLICY "pt_chat_group_members_delete"
  ON public.pt_chat_group_members FOR DELETE TO authenticated
  USING (
    atleta_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.pt_chat_groups g
      WHERE g.id = group_id AND g.pt_user_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "pt_chat_group_reads_select" ON public.pt_chat_group_reads;
CREATE POLICY "pt_chat_group_reads_select"
  ON public.pt_chat_group_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "pt_chat_group_reads_insert" ON public.pt_chat_group_reads;
CREATE POLICY "pt_chat_group_reads_insert"
  ON public.pt_chat_group_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_chat_group_participant(group_id, auth.uid()));

DROP POLICY IF EXISTS "pt_chat_group_reads_update" ON public.pt_chat_group_reads;
CREATE POLICY "pt_chat_group_reads_update"
  ON public.pt_chat_group_reads FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------
-- RLS: messages — estese per includere i messaggi di gruppo
-- -----------------------------------------------------

DROP POLICY IF EXISTS "Chat participants can view messages" ON public.messages;
CREATE POLICY "Chat participants can view messages"
  ON public.messages FOR SELECT TO authenticated
  USING (
    (chat_id IS NOT NULL AND public.is_chat_participant(auth.uid(), chat_id))
    OR (chat_group_id IS NOT NULL AND public.is_chat_group_participant(chat_group_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Chat participants can send messages" ON public.messages;
CREATE POLICY "Chat participants can send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_user_id
    AND (
      (chat_id IS NOT NULL AND public.is_chat_participant(auth.uid(), chat_id))
      OR (chat_group_id IS NOT NULL AND public.is_chat_group_participant(chat_group_id, auth.uid()))
    )
  );

-- (le policy "Sender can update own message" e "Admins can view all messages" restano valide invariate)

-- -----------------------------------------------------
-- STORAGE: bucket chat-attachments (immagini/video, privato)
-- Path convention: ${uploader_user_id}/${conversationKey}/${filename}
-- conversationKey = chat_id (1:1) oppure `group-<group_id>` (gruppo)
-- -----------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  false,
  26214400, -- 25MB hard cap lato bucket (immagini limitate a 5MB lato client)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users can upload own chat attachments" ON storage.objects;
CREATE POLICY "Users can upload own chat attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can view own chat attachments" ON storage.objects;
CREATE POLICY "Users can view own chat attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own chat attachments" ON storage.objects;
CREATE POLICY "Users can delete own chat attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
