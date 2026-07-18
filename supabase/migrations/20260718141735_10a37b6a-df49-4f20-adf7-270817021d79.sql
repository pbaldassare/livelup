-- Gruppi: policy canale Staff + membri visibili nei pubblici
DROP POLICY IF EXISTS "group_members_select" ON public.group_members;
CREATE POLICY "group_members_select"
  ON public.group_members FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.is_group_member(group_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_members.group_id
        AND g.status = 'active'
        AND g.visibility = 'public'
    )
  );

DROP POLICY IF EXISTS "group_messages_select" ON public.group_messages;
CREATE POLICY "group_messages_select"
  ON public.group_messages FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR (
      public.is_group_member(group_id, auth.uid())
      AND (
        channel IN ('general', 'announcements')
        OR (channel = 'admins' AND public.is_group_admin(group_id, auth.uid()))
      )
    )
  );

DROP POLICY IF EXISTS "group_messages_insert" ON public.group_messages;
CREATE POLICY "group_messages_insert"
  ON public.group_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_user_id = auth.uid()
    AND public.is_group_member(group_id, auth.uid())
    AND (
      channel = 'general'
      OR (channel IN ('announcements', 'admins') AND public.is_group_admin(group_id, auth.uid()))
    )
  );

ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS duration_seconds integer;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS sets_completed integer;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS reps_total integer;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS volume_kg numeric;

ALTER TABLE public.pt_profiles
  ADD COLUMN IF NOT EXISTS availability_bookable boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Atleta can view connected PT profile" ON public.pt_profiles;
CREATE POLICY "Atleta can view connected PT profile"
  ON public.pt_profiles FOR SELECT
  USING (public.is_atleta(auth.uid()) AND public.are_connected(user_id, auth.uid()));

DROP POLICY IF EXISTS "Atleta can view connected PT availability" ON public.pt_availability;
CREATE POLICY "Atleta can view connected PT availability"
  ON public.pt_availability FOR SELECT
  USING (
    public.is_atleta(auth.uid())
    AND public.are_connected(pt_user_id, auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.pt_profiles pp
      WHERE pp.user_id = pt_availability.pt_user_id AND pp.availability_bookable = true
    )
  );

DROP POLICY IF EXISTS "Public can view bookable PT availability" ON public.pt_availability;
CREATE POLICY "Public can view bookable PT availability"
  ON public.pt_availability FOR SELECT
  USING (
    is_available = true
    AND EXISTS (
      SELECT 1 FROM public.pt_profiles pp
      WHERE pp.user_id = pt_availability.pt_user_id
        AND pp.availability_bookable = true
        AND pp.is_discoverable = true
        AND pp.status = 'attivo'
    )
  );

CREATE TABLE IF NOT EXISTS public.pt_google_calendar_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_email text,
  google_account_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  calendar_id text DEFAULT 'primary',
  status text NOT NULL DEFAULT 'connected'
    CHECK (status IN ('connected', 'disconnected', 'error', 'pending')),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pt_user_id)
);
CREATE INDEX IF NOT EXISTS idx_pt_gcal_connections_pt
  ON public.pt_google_calendar_connections(pt_user_id);
ALTER TABLE public.pt_google_calendar_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pt_google_calendar_connections FROM PUBLIC;
REVOKE ALL ON public.pt_google_calendar_connections FROM anon;
REVOKE ALL ON public.pt_google_calendar_connections FROM authenticated;
GRANT ALL ON public.pt_google_calendar_connections TO service_role;
GRANT SELECT (
  id, pt_user_id, google_email, google_account_id, calendar_id,
  status, last_synced_at, last_error, created_at, updated_at
) ON public.pt_google_calendar_connections TO authenticated;
GRANT DELETE ON public.pt_google_calendar_connections TO authenticated;

DROP POLICY IF EXISTS "PT select own google calendar connection" ON public.pt_google_calendar_connections;
CREATE POLICY "PT select own google calendar connection"
  ON public.pt_google_calendar_connections FOR SELECT
  USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

DROP POLICY IF EXISTS "PT delete own google calendar connection" ON public.pt_google_calendar_connections;
CREATE POLICY "PT delete own google calendar connection"
  ON public.pt_google_calendar_connections FOR DELETE
  USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

DROP POLICY IF EXISTS "Admins view google calendar connections" ON public.pt_google_calendar_connections;
CREATE POLICY "Admins view google calendar connections"
  ON public.pt_google_calendar_connections FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS update_pt_gcal_connections_updated_at ON public.pt_google_calendar_connections;
CREATE TRIGGER update_pt_gcal_connections_updated_at
  BEFORE UPDATE ON public.pt_google_calendar_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'article',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS author_kind TEXT NOT NULL DEFAULT 'pt',
  ADD COLUMN IF NOT EXISTS professional_profile_id UUID REFERENCES public.professional_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hidden_by UUID;

DO $$ BEGIN
  ALTER TABLE public.blog_posts
    ADD CONSTRAINT blog_posts_post_type_check CHECK (post_type IN ('article', 'curiosity', 'qa'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.blog_posts
    ADD CONSTRAINT blog_posts_status_check CHECK (status IN ('draft', 'published', 'hidden'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.blog_posts
    ADD CONSTRAINT blog_posts_author_kind_check CHECK (author_kind IN ('pt', 'nutrizionista', 'fisioterapista', 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

UPDATE public.blog_posts SET status = 'published' WHERE is_published = true AND status = 'draft';

CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts (status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_post_type ON public.blog_posts (post_type);
CREATE INDEX IF NOT EXISTS idx_blog_posts_professional_profile_id ON public.blog_posts (professional_profile_id);

CREATE OR REPLACE FUNCTION public.sync_blog_post_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.is_published := (NEW.status = 'published');
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;
  IF NEW.status = 'hidden' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'hidden') THEN
    NEW.hidden_at := now();
  ELSIF NEW.status <> 'hidden' THEN
    NEW.hidden_at := NULL;
    NEW.hidden_by := NULL;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS blog_posts_sync_status ON public.blog_posts;
CREATE TRIGGER blog_posts_sync_status
BEFORE INSERT OR UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.sync_blog_post_status();

DROP POLICY IF EXISTS "PT can manage own blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Anyone can view published blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can manage all blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authors can manage own blog posts" ON public.blog_posts;

CREATE POLICY "Authors can manage own blog posts"
ON public.blog_posts FOR ALL TO authenticated
USING (
  auth.uid() = pt_user_id
  AND (
    public.is_pt(auth.uid())
    OR public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.professional_profiles pp WHERE pp.user_id = auth.uid())
  )
)
WITH CHECK (
  auth.uid() = pt_user_id
  AND (
    public.is_pt(auth.uid())
    OR public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.professional_profiles pp WHERE pp.user_id = auth.uid())
  )
);

CREATE POLICY "Admins can manage all blog posts"
ON public.blog_posts FOR ALL TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Anyone can view published blog posts"
ON public.blog_posts FOR SELECT TO public
USING (status = 'published');

CREATE OR REPLACE FUNCTION public.search_pt_colleagues(_query TEXT DEFAULT NULL)
RETURNS TABLE (
  user_id UUID, first_name TEXT, last_name TEXT, avatar_url TEXT,
  bio TEXT, specializations TEXT[], location_city TEXT,
  experience_years INTEGER, offers_online BOOLEAN, offers_in_person BOOLEAN,
  rating_avg NUMERIC, review_count INTEGER
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_pt_id UUID := auth.uid();
  v_q TEXT := NULLIF(trim(_query), '');
BEGIN
  IF v_pt_id IS NULL OR NOT public.is_pt(v_pt_id) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;
  RETURN QUERY
  SELECT pp.user_id, p.first_name, p.last_name, p.avatar_url,
    pp.bio, pp.specializations, pp.location_city, pp.experience_years,
    pp.offers_online, pp.offers_in_person, pp.rating_avg, pp.review_count
  FROM public.pt_profiles pp
  INNER JOIN public.profiles p ON p.user_id = pp.user_id
  INNER JOIN public.user_roles ur ON ur.user_id = pp.user_id AND ur.role = 'pt'
  WHERE pp.user_id <> v_pt_id
    AND pp.status = 'attivo'
    AND (
      v_q IS NULL
      OR p.first_name ILIKE '%' || v_q || '%'
      OR p.last_name ILIKE '%' || v_q || '%'
      OR pp.location_city ILIKE '%' || v_q || '%'
      OR EXISTS (SELECT 1 FROM unnest(pp.specializations) AS s WHERE s ILIKE '%' || v_q || '%')
    )
  ORDER BY pp.rating_avg DESC NULLS LAST, p.last_name, p.first_name
  LIMIT 50;
END;
$$;
GRANT EXECUTE ON FUNCTION public.search_pt_colleagues(TEXT) TO authenticated;

DROP POLICY IF EXISTS "Group members can view fellow group members profiles" ON public.profiles;
CREATE POLICY "Group members can view fellow group members profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm_self
      JOIN public.group_members gm_target ON gm_target.group_id = gm_self.group_id
      WHERE gm_self.user_id = auth.uid()
        AND gm_self.status = 'active'
        AND gm_target.user_id = profiles.user_id
        AND gm_target.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Anyone can view profiles of public group members" ON public.profiles;
CREATE POLICY "Anyone can view profiles of public group members"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      JOIN public.groups g ON g.id = gm.group_id
      WHERE gm.user_id = profiles.user_id
        AND gm.status = 'active'
        AND g.status = 'active'
        AND g.visibility = 'public'
    )
  );

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
CREATE TABLE IF NOT EXISTS public.pt_chat_group_reads (
  group_id UUID NOT NULL REFERENCES public.pt_chat_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_pt_chat_groups_pt ON public.pt_chat_groups(pt_user_id);
CREATE INDEX IF NOT EXISTS idx_pt_chat_group_members_group ON public.pt_chat_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_pt_chat_group_members_athlete ON public.pt_chat_group_members(atleta_user_id);

ALTER TABLE public.messages ALTER COLUMN chat_id DROP NOT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS chat_group_id UUID REFERENCES public.pt_chat_groups(id) ON DELETE CASCADE;

DO $$ BEGIN
  ALTER TABLE public.messages
    ADD CONSTRAINT messages_target_check CHECK (
      (chat_id IS NOT NULL AND chat_group_id IS NULL)
      OR (chat_id IS NULL AND chat_group_id IS NOT NULL)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_messages_chat_group ON public.messages(chat_group_id);

CREATE OR REPLACE FUNCTION public.is_chat_group_participant(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
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

DROP TRIGGER IF EXISTS update_pt_chat_groups_updated_at ON public.pt_chat_groups;
CREATE TRIGGER update_pt_chat_groups_updated_at
  BEFORE UPDATE ON public.pt_chat_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.update_chat_last_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.chat_id IS NOT NULL THEN
    UPDATE public.chats SET last_message_at = NEW.created_at, updated_at = now() WHERE id = NEW.chat_id;
  ELSIF NEW.chat_group_id IS NOT NULL THEN
    UPDATE public.pt_chat_groups SET updated_at = now() WHERE id = NEW.chat_group_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_message_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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
    IF chat_record.id IS NULL THEN RETURN NEW; END IF;
    IF NEW.sender_user_id = chat_record.pt_user_id THEN
      recipient_id := chat_record.atleta_user_id;
    ELSE
      recipient_id := chat_record.pt_user_id;
    END IF;
    INSERT INTO public.notifications (user_id, type, title, body, data, action_url)
    VALUES (recipient_id, 'message', 'Nuovo messaggio', LEFT(notif_body, 100),
      jsonb_build_object('chat_id', NEW.chat_id, 'message_id', NEW.id),
      '/messages/' || NEW.chat_id::TEXT);
  ELSIF NEW.chat_group_id IS NOT NULL THEN
    SELECT * INTO group_record FROM public.pt_chat_groups WHERE id = NEW.chat_group_id;
    IF group_record.id IS NULL THEN RETURN NEW; END IF;
    IF NEW.sender_user_id <> group_record.pt_user_id THEN
      INSERT INTO public.notifications (user_id, type, title, body, data, action_url)
      VALUES (group_record.pt_user_id, 'message',
        'Nuovo messaggio nel gruppo ' || group_record.name,
        LEFT(notif_body, 100),
        jsonb_build_object('chat_group_id', NEW.chat_group_id, 'message_id', NEW.id),
        '/pt/app/chat/group/' || NEW.chat_group_id::TEXT);
    END IF;
    FOR member IN
      SELECT atleta_user_id FROM public.pt_chat_group_members
      WHERE group_id = NEW.chat_group_id AND atleta_user_id <> NEW.sender_user_id
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body, data, action_url)
      VALUES (member.atleta_user_id, 'message',
        'Nuovo messaggio nel gruppo ' || group_record.name,
        LEFT(notif_body, 100),
        jsonb_build_object('chat_group_id', NEW.chat_group_id, 'message_id', NEW.id),
        '/app/chat/group/' || NEW.chat_group_id::TEXT);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

ALTER TABLE public.pt_chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_chat_group_reads ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pt_chat_groups TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.pt_chat_group_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pt_chat_group_reads TO authenticated;
GRANT ALL ON public.pt_chat_groups TO service_role;
GRANT ALL ON public.pt_chat_group_members TO service_role;
GRANT ALL ON public.pt_chat_group_reads TO service_role;

DROP POLICY IF EXISTS "pt_chat_groups_select" ON public.pt_chat_groups;
CREATE POLICY "pt_chat_groups_select" ON public.pt_chat_groups FOR SELECT TO authenticated
  USING (public.is_chat_group_participant(id, auth.uid()));
DROP POLICY IF EXISTS "pt_chat_groups_admin_select" ON public.pt_chat_groups;
CREATE POLICY "pt_chat_groups_admin_select" ON public.pt_chat_groups FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "pt_chat_groups_insert" ON public.pt_chat_groups;
CREATE POLICY "pt_chat_groups_insert" ON public.pt_chat_groups FOR INSERT TO authenticated
  WITH CHECK (pt_user_id = auth.uid() AND public.is_pt(auth.uid()));
DROP POLICY IF EXISTS "pt_chat_groups_update" ON public.pt_chat_groups;
CREATE POLICY "pt_chat_groups_update" ON public.pt_chat_groups FOR UPDATE TO authenticated
  USING (pt_user_id = auth.uid()) WITH CHECK (pt_user_id = auth.uid());
DROP POLICY IF EXISTS "pt_chat_groups_delete" ON public.pt_chat_groups;
CREATE POLICY "pt_chat_groups_delete" ON public.pt_chat_groups FOR DELETE TO authenticated
  USING (pt_user_id = auth.uid());
DROP POLICY IF EXISTS "pt_chat_group_members_select" ON public.pt_chat_group_members;
CREATE POLICY "pt_chat_group_members_select" ON public.pt_chat_group_members FOR SELECT TO authenticated
  USING (public.is_chat_group_participant(group_id, auth.uid()) OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "pt_chat_group_members_insert" ON public.pt_chat_group_members;
CREATE POLICY "pt_chat_group_members_insert" ON public.pt_chat_group_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pt_chat_groups g WHERE g.id = group_id AND g.pt_user_id = auth.uid())
    AND public.are_connected(auth.uid(), atleta_user_id)
  );
DROP POLICY IF EXISTS "pt_chat_group_members_delete" ON public.pt_chat_group_members;
CREATE POLICY "pt_chat_group_members_delete" ON public.pt_chat_group_members FOR DELETE TO authenticated
  USING (
    atleta_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.pt_chat_groups g WHERE g.id = group_id AND g.pt_user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );
DROP POLICY IF EXISTS "pt_chat_group_reads_select" ON public.pt_chat_group_reads;
CREATE POLICY "pt_chat_group_reads_select" ON public.pt_chat_group_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "pt_chat_group_reads_insert" ON public.pt_chat_group_reads;
CREATE POLICY "pt_chat_group_reads_insert" ON public.pt_chat_group_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_chat_group_participant(group_id, auth.uid()));
DROP POLICY IF EXISTS "pt_chat_group_reads_update" ON public.pt_chat_group_reads;
CREATE POLICY "pt_chat_group_reads_update" ON public.pt_chat_group_reads FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

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

ALTER TABLE public.pt_atleta_connections
  ADD COLUMN IF NOT EXISTS training_modality TEXT DEFAULT 'mix';
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pt_atleta_connections_training_modality_check'
  ) THEN
    ALTER TABLE public.pt_atleta_connections
      ADD CONSTRAINT pt_atleta_connections_training_modality_check
      CHECK (training_modality IS NULL OR training_modality IN ('in_presenza', 'online', 'mix'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_pt_atleta_connections_training_modality
  ON public.pt_atleta_connections (pt_user_id, training_modality)
  WHERE status = 'active';

CREATE OR REPLACE FUNCTION public._activate_pt_atleta_connection(
  _pt_user_id UUID, _atleta_user_id UUID, _requested_by UUID
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_conn_id UUID;
  v_modality TEXT;
BEGIN
  SELECT training_modality INTO v_modality
  FROM public.pt_atleta_connections
  WHERE atleta_user_id = _atleta_user_id AND status = 'active'
  ORDER BY accepted_at DESC NULLS LAST LIMIT 1;
  SELECT id INTO v_conn_id
  FROM public.pt_atleta_connections
  WHERE pt_user_id = _pt_user_id AND atleta_user_id = _atleta_user_id;
  IF v_conn_id IS NOT NULL THEN
    UPDATE public.pt_atleta_connections
    SET status = 'active',
        accepted_at = COALESCE(accepted_at, now()),
        terminated_at = NULL,
        is_pt_active = true,
        training_modality = COALESCE(training_modality, v_modality, 'mix'),
        updated_at = now()
    WHERE id = v_conn_id;
    RETURN v_conn_id;
  END IF;
  INSERT INTO public.pt_atleta_connections (
    pt_user_id, atleta_user_id, status, requested_by, accepted_at, training_modality
  ) VALUES (
    _pt_user_id, _atleta_user_id, 'active', _requested_by, now(), COALESCE(v_modality, 'mix')
  )
  RETURNING id INTO v_conn_id;
  RETURN v_conn_id;
END;
$$;
REVOKE ALL ON FUNCTION public._activate_pt_atleta_connection(UUID, UUID, UUID) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.get_ceded_athletes_for_pt()
RETURNS TABLE (
  atleta_user_id UUID, first_name TEXT, last_name TEXT, avatar_url TEXT,
  email TEXT, training_modality TEXT, fitness_level TEXT,
  current_pt_user_id UUID, current_pt_first_name TEXT, current_pt_last_name TEXT,
  transferred_at TIMESTAMPTZ, is_recallable BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pt_id UUID := auth.uid();
BEGIN
  IF v_pt_id IS NULL OR NOT public.is_pt(v_pt_id) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;
  RETURN QUERY
  WITH latest_out AS (
    SELECT DISTINCT ON (t.atleta_user_id) t.atleta_user_id, t.to_pt_user_id, t.completed_at
    FROM public.pt_atleta_transfers t
    WHERE t.from_pt_user_id = v_pt_id AND t.action = 'transfer_out' AND t.status = 'completed'
    ORDER BY t.atleta_user_id, t.completed_at DESC NULLS LAST, t.created_at DESC
  ),
  later_recall AS (
    SELECT DISTINCT ON (t.atleta_user_id) t.atleta_user_id, t.completed_at
    FROM public.pt_atleta_transfers t
    WHERE t.to_pt_user_id = v_pt_id AND t.action = 'recall' AND t.status = 'completed'
    ORDER BY t.atleta_user_id, t.completed_at DESC NULLS LAST, t.created_at DESC
  )
  SELECT lo.atleta_user_id, ap.first_name, ap.last_name, ap.avatar_url, ap.email,
    COALESCE(c.training_modality, prev.training_modality, 'mix') AS training_modality,
    atl.fitness_level, c.pt_user_id AS current_pt_user_id,
    cp.first_name AS current_pt_first_name, cp.last_name AS current_pt_last_name,
    lo.completed_at AS transferred_at,
    (c.pt_user_id IS NOT NULL AND c.pt_user_id = lo.to_pt_user_id AND c.status = 'active'
      AND (lr.completed_at IS NULL OR lr.completed_at < lo.completed_at)) AS is_recallable
  FROM latest_out lo
  LEFT JOIN later_recall lr ON lr.atleta_user_id = lo.atleta_user_id
  INNER JOIN public.profiles ap ON ap.user_id = lo.atleta_user_id
  LEFT JOIN public.atleta_profiles atl ON atl.user_id = lo.atleta_user_id
  LEFT JOIN public.pt_atleta_connections c
    ON c.atleta_user_id = lo.atleta_user_id AND c.status = 'active'
  LEFT JOIN public.profiles cp ON cp.user_id = c.pt_user_id
  LEFT JOIN LATERAL (
    SELECT pc.training_modality FROM public.pt_atleta_connections pc
    WHERE pc.atleta_user_id = lo.atleta_user_id AND pc.pt_user_id = v_pt_id
    ORDER BY pc.updated_at DESC NULLS LAST LIMIT 1
  ) prev ON true
  WHERE lr.completed_at IS NULL OR lr.completed_at < lo.completed_at
  ORDER BY lo.completed_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_ceded_athletes_for_pt() TO authenticated;

CREATE OR REPLACE FUNCTION public.transfer_athletes_to_pt(
  _atleta_user_ids UUID[], _to_pt_user_id UUID, _notes TEXT DEFAULT NULL
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id UUID;
  v_count INTEGER := 0;
BEGIN
  IF _atleta_user_ids IS NULL OR cardinality(_atleta_user_ids) = 0 THEN
    RAISE EXCEPTION 'Seleziona almeno un atleta';
  END IF;
  FOREACH v_id IN ARRAY _atleta_user_ids
  LOOP
    PERFORM public.transfer_athlete_to_pt(v_id, _to_pt_user_id, _notes);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.transfer_athletes_to_pt(UUID[], UUID, TEXT) TO authenticated;

ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS google_event_id text;
CREATE INDEX IF NOT EXISTS idx_calendar_events_google_event_id
  ON public.calendar_events(google_event_id)
  WHERE google_event_id IS NOT NULL;

-- B4: Blog & Q&A demo seed (idempotente) — lookup PT via auth.users diretta
DO $$
DECLARE
  v_pt_ids UUID[];
  v_pt_count INT;
  v_nutri RECORD;
  v_fisio RECORD;
BEGIN
  SELECT COALESCE(array_agg(u.id ORDER BY u.email), '{}'::UUID[]) INTO v_pt_ids
  FROM auth.users u
  WHERE lower(u.email) IN (
    'elena.vitale.pt@fitplatform.com',
    'davide.russo.pt@fitplatform.com',
    'chiara.lombardi.pt@fitplatform.com'
  );

  IF array_length(v_pt_ids, 1) IS NULL OR array_length(v_pt_ids, 1) = 0 THEN
    SELECT COALESCE(array_agg(ur.user_id), '{}'::UUID[]) INTO v_pt_ids
    FROM (SELECT user_id FROM public.user_roles WHERE role = 'pt' ORDER BY user_id LIMIT 3) ur;
  END IF;

  v_pt_count := COALESCE(array_length(v_pt_ids, 1), 0);

  IF v_pt_count > 0 THEN
    IF NOT EXISTS (SELECT 1 FROM public.blog_posts WHERE slug = 'programmazione-settimanale-efficace') THEN
      INSERT INTO public.blog_posts (pt_user_id, title, content, slug, tags, post_type, status, author_kind, published_at)
      VALUES (v_pt_ids[1], 'Come impostare una programmazione settimanale efficace',
        'Una buona programmazione settimanale bilancia stimolo e recupero.',
        'programmazione-settimanale-efficace',
        ARRAY['programmazione', 'allenamento', 'principianti'],
        'article', 'published', 'pt', now());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.blog_posts WHERE slug = 'errori-comuni-tecnica-squat') THEN
      INSERT INTO public.blog_posts (pt_user_id, title, content, slug, tags, post_type, status, author_kind, published_at)
      VALUES (v_pt_ids[1 + (1 % v_pt_count)], '5 errori comuni nella tecnica di squat',
        'Lo squat è uno degli esercizi più completi ma anche più soggetto a errori tecnici.',
        'errori-comuni-tecnica-squat',
        ARRAY['squat', 'tecnica', 'forza'],
        'article', 'published', 'pt', now());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.blog_posts WHERE slug = 'muscolo-piu-forte-corpo-umano') THEN
      INSERT INTO public.blog_posts (pt_user_id, title, content, slug, tags, post_type, status, author_kind, published_at)
      VALUES (v_pt_ids[1 + (2 % v_pt_count)], 'Lo sapevi? Qual è il muscolo più forte del corpo umano',
        'In rapporto al peso, il masetere è considerato il muscolo più forte.',
        'muscolo-piu-forte-corpo-umano',
        ARRAY['curiosità', 'anatomia'],
        'curiosity', 'published', 'pt', now());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.blog_posts WHERE slug = 'quanto-tempo-primi-risultati-palestra') THEN
      INSERT INTO public.blog_posts (pt_user_id, title, content, slug, tags, post_type, status, author_kind, published_at)
      VALUES (v_pt_ids[1], 'Quanto tempo serve per vedere i primi risultati in palestra?',
        'I primi adattamenti neuromuscolari si notano dopo 2-3 settimane.',
        'quanto-tempo-primi-risultati-palestra',
        ARRAY['curiosità', 'risultati'],
        'curiosity', 'published', 'pt', now());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.blog_posts WHERE slug = 'quante-volte-settimana-allenarsi-principianti') THEN
      INSERT INTO public.blog_posts (pt_user_id, title, content, slug, tags, post_type, status, author_kind, published_at)
      VALUES (v_pt_ids[1 + (1 % v_pt_count)], 'Quante volte a settimana dovrei allenarmi da principiante?',
        'Per chi inizia, 3 sedute a settimana sono l''ideale.',
        'quante-volte-settimana-allenarsi-principianti',
        ARRAY['q&a', 'principianti'],
        'qa', 'published', 'pt', now());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.blog_posts WHERE slug = 'doms-dolori-muscolari-normali') THEN
      INSERT INTO public.blog_posts (pt_user_id, title, content, slug, tags, post_type, status, author_kind, published_at)
      VALUES (v_pt_ids[1 + (2 % v_pt_count)], 'È normale avere dolori muscolari (DOMS) dopo ogni allenamento?',
        'Un minimo di indolenzimento nelle 24-48h è normale.',
        'doms-dolori-muscolari-normali',
        ARRAY['q&a', 'recupero'],
        'qa', 'published', 'pt', now());
    END IF;
  END IF;

  SELECT id, first_name, last_name INTO v_nutri
  FROM public.professional_profiles WHERE profession_type = 'nutrizionista'
  ORDER BY created_at LIMIT 1;

  IF v_nutri.id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.blog_posts WHERE slug = 'periodizzazione-nutrizionale-basi'
  ) THEN
    INSERT INTO public.blog_posts (
      pt_user_id, professional_profile_id, title, content, slug, tags, post_type, status, author_kind, published_at
    )
    SELECT pp.user_id, pp.id,
      'Alimentazione e allenamento: le basi della periodizzazione nutrizionale',
      'La periodizzazione nutrizionale consiste nell''adattare l''alimentazione alle fasi dell''allenamento.',
      'periodizzazione-nutrizionale-basi',
      ARRAY['nutrizione', 'periodizzazione'],
      'article', 'published', 'nutrizionista', now()
    FROM public.professional_profiles pp WHERE pp.id = v_nutri.id;
  END IF;

  SELECT id, first_name, last_name INTO v_fisio
  FROM public.professional_profiles WHERE profession_type = 'fisioterapista'
  ORDER BY created_at LIMIT 1;

  IF v_fisio.id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.blog_posts WHERE slug = 'sonno-crescita-muscolare-ruolo'
  ) THEN
    INSERT INTO public.blog_posts (
      pt_user_id, professional_profile_id, title, content, slug, tags, post_type, status, author_kind, published_at
    )
    SELECT pp.user_id, pp.id,
      'Il ruolo del sonno nella crescita muscolare',
      'Durante il sonno profondo il corpo rilascia la maggior parte dell''ormone della crescita.',
      'sonno-crescita-muscolare-ruolo',
      ARRAY['curiosità', 'recupero', 'sonno'],
      'curiosity', 'published', 'fisioterapista', now()
    FROM public.professional_profiles pp WHERE pp.id = v_fisio.id;
  END IF;

  IF v_fisio.id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.blog_posts WHERE slug = 'allenarsi-con-schiena-sensibile'
  ) THEN
    INSERT INTO public.blog_posts (
      pt_user_id, professional_profile_id, title, content, slug, tags, post_type, status, author_kind, published_at
    )
    SELECT pp.user_id, pp.id,
      'Posso allenarmi anche se ho la schiena sensibile?',
      'Nella maggior parte dei casi sì, ma con alcuni adattamenti.',
      'allenarsi-con-schiena-sensibile',
      ARRAY['q&a', 'schiena'],
      'qa', 'published', 'fisioterapista', now()
    FROM public.professional_profiles pp WHERE pp.id = v_fisio.id;
  END IF;
END $$;