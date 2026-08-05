-- =====================================================
-- Community groups: annunci mini-evento + RSVP + like messaggi
-- + storage allegati chat gruppo (max 20MB)
-- =====================================================

-- 1) Annunci (mini-evento)
CREATE TABLE IF NOT EXISTS public.group_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  cover_url text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  place_label text,
  address_line text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT group_announcements_title_len CHECK (char_length(btrim(title)) BETWEEN 1 AND 120)
);

CREATE INDEX IF NOT EXISTS idx_group_announcements_group_starts
  ON public.group_announcements (group_id, starts_at DESC);

-- 2) RSVP / Partecipa
CREATE TABLE IF NOT EXISTS public.group_announcement_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.group_announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_announcement_rsvps_announcement
  ON public.group_announcement_rsvps (announcement_id);

-- 3) Like messaggi gruppo
CREATE TABLE IF NOT EXISTS public.group_message_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.group_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_message_likes_message
  ON public.group_message_likes (message_id);

-- 4) GRANT + RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_announcements TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.group_announcement_rsvps TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.group_message_likes TO authenticated;

ALTER TABLE public.group_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_announcement_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_message_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "group_announcements_select" ON public.group_announcements;
CREATE POLICY "group_announcements_select"
  ON public.group_announcements FOR SELECT TO authenticated
  USING (
    public.is_group_member(group_id, auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "group_announcements_insert" ON public.group_announcements;
CREATE POLICY "group_announcements_insert"
  ON public.group_announcements FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.is_group_admin(group_id, auth.uid())
  );

DROP POLICY IF EXISTS "group_announcements_update" ON public.group_announcements;
CREATE POLICY "group_announcements_update"
  ON public.group_announcements FOR UPDATE TO authenticated
  USING (
    public.is_group_admin(group_id, auth.uid())
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    public.is_group_admin(group_id, auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "group_announcements_delete" ON public.group_announcements;
CREATE POLICY "group_announcements_delete"
  ON public.group_announcements FOR DELETE TO authenticated
  USING (
    public.is_group_admin(group_id, auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "group_announcement_rsvps_select" ON public.group_announcement_rsvps;
CREATE POLICY "group_announcement_rsvps_select"
  ON public.group_announcement_rsvps FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_announcements a
      WHERE a.id = announcement_id
        AND (public.is_group_member(a.group_id, auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "group_announcement_rsvps_insert" ON public.group_announcement_rsvps;
CREATE POLICY "group_announcement_rsvps_insert"
  ON public.group_announcement_rsvps FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.group_announcements a
      WHERE a.id = announcement_id
        AND public.is_group_member(a.group_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "group_announcement_rsvps_delete" ON public.group_announcement_rsvps;
CREATE POLICY "group_announcement_rsvps_delete"
  ON public.group_announcement_rsvps FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_announcements a
      WHERE a.id = announcement_id
        AND (public.is_group_admin(a.group_id, auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "group_message_likes_select" ON public.group_message_likes;
CREATE POLICY "group_message_likes_select"
  ON public.group_message_likes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_messages m
      WHERE m.id = message_id
        AND (public.is_group_member(m.group_id, auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "group_message_likes_insert" ON public.group_message_likes;
CREATE POLICY "group_message_likes_insert"
  ON public.group_message_likes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.group_messages m
      WHERE m.id = message_id
        AND public.is_group_member(m.group_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "group_message_likes_delete" ON public.group_message_likes;
CREATE POLICY "group_message_likes_delete"
  ON public.group_message_likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 5) Storage allegati chat community group (20MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'group-chat-attachments',
  'group-chat-attachments',
  true,
  20971520,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  public = EXCLUDED.public;

DROP POLICY IF EXISTS "Users can upload group chat attachments" ON storage.objects;
CREATE POLICY "Users can upload group chat attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'group-chat-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update own group chat attachments" ON storage.objects;
CREATE POLICY "Users can update own group chat attachments"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'group-chat-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own group chat attachments" ON storage.objects;
CREATE POLICY "Users can delete own group chat attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'group-chat-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Anyone can read group chat attachments" ON storage.objects;
CREATE POLICY "Anyone can read group chat attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'group-chat-attachments');

-- Locandine annunci: riusa group-images (già pubblico)

COMMENT ON TABLE public.group_announcements IS
  'Annunci community come mini-evento (titolo, cover, data/ora, luogo, testo).';
COMMENT ON TABLE public.group_announcement_rsvps IS
  'Partecipazioni (tap Partecipa) agli annunci gruppo.';
COMMENT ON TABLE public.group_message_likes IS
  'Like sui messaggi delle chat community group.';
