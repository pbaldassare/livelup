CREATE TYPE public.group_visibility AS ENUM ('public', 'private');
CREATE TYPE public.group_status AS ENUM ('active', 'suspended', 'pending_review');
CREATE TYPE public.group_member_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE public.group_member_status AS ENUM ('active', 'banned');
CREATE TYPE public.group_channel AS ENUM ('general', 'announcements');

CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text,
  location_name text,
  latitude double precision,
  longitude double precision,
  visibility public.group_visibility NOT NULL DEFAULT 'public',
  status public.group_status NOT NULL DEFAULT 'active',
  is_official boolean NOT NULL DEFAULT false,
  invite_token uuid NOT NULL DEFAULT gen_random_uuid(),
  policy_accepted_at timestamptz NOT NULL DEFAULT now(),
  members_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.group_disciplines (
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  pt_type_id uuid NOT NULL REFERENCES public.pt_types(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, pt_type_id)
);

CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.group_member_role NOT NULL DEFAULT 'member',
  status public.group_member_status NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE TABLE public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel public.group_channel NOT NULL DEFAULT 'general',
  content text NOT NULL,
  attachment_url text,
  attachment_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_groups_status_visibility ON public.groups (status, visibility);
CREATE INDEX idx_groups_name_lower ON public.groups (lower(name));
CREATE INDEX idx_group_members_user ON public.group_members (user_id, status);
CREATE INDEX idx_group_messages_group_channel ON public.group_messages (group_id, channel, created_at DESC);

CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = _group_id AND user_id = _user_id AND status = 'active');
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(_group_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = _group_id AND user_id = _user_id AND status = 'active' AND role IN ('owner', 'admin'));
$$;

CREATE OR REPLACE FUNCTION public.can_view_group(_group_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups g WHERE g.id = _group_id AND (
      public.is_admin(_user_id)
      OR (g.status = 'active' AND g.visibility = 'public')
      OR public.is_group_member(_group_id, _user_id)
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_group_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, role, status)
  VALUES (NEW.id, NEW.owner_user_id, 'owner', 'active');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_group_created_add_owner
  AFTER INSERT ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_group_owner();

CREATE OR REPLACE FUNCTION public.sync_group_members_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_group_id uuid;
BEGIN
  v_group_id := COALESCE(NEW.group_id, OLD.group_id);
  UPDATE public.groups
  SET members_count = (SELECT count(*)::integer FROM public.group_members WHERE group_id = v_group_id AND status = 'active'),
      updated_at = now()
  WHERE id = v_group_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER on_group_member_change_count
  AFTER INSERT OR UPDATE OR DELETE ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_group_members_count();

CREATE OR REPLACE FUNCTION public.set_groups_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.set_groups_updated_at();

CREATE OR REPLACE FUNCTION public.get_group_by_invite_token(_token uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_group public.groups%ROWTYPE;
BEGIN
  IF _token IS NULL THEN RETURN jsonb_build_object('found', false); END IF;
  SELECT * INTO v_group FROM public.groups WHERE invite_token = _token AND status = 'active' LIMIT 1;
  IF v_group.id IS NULL THEN RETURN jsonb_build_object('found', false); END IF;
  RETURN jsonb_build_object(
    'found', true, 'id', v_group.id, 'name', v_group.name, 'description', v_group.description,
    'image_url', v_group.image_url, 'location_name', v_group.location_name, 'visibility', v_group.visibility,
    'members_count', v_group.members_count, 'is_official', v_group.is_official
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.join_group(_group_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_group public.groups%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non autenticato'; END IF;
  SELECT * INTO v_group FROM public.groups WHERE id = _group_id;
  IF v_group.id IS NULL THEN RAISE EXCEPTION 'Gruppo non trovato'; END IF;
  IF v_group.status <> 'active' THEN RAISE EXCEPTION 'Gruppo non disponibile'; END IF;
  IF public.is_group_member(_group_id, v_uid) THEN
    RETURN jsonb_build_object('joined', true, 'already_member', true);
  END IF;
  INSERT INTO public.group_members (group_id, user_id, role, status) VALUES (_group_id, v_uid, 'member', 'active');
  RETURN jsonb_build_object('joined', true, 'already_member', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_group_status(_group_id uuid, _status public.group_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Accesso non autorizzato'; END IF;
  UPDATE public.groups SET status = _status, updated_at = now() WHERE id = _group_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_group_official(_group_id uuid, _is_official boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Accesso non autorizzato'; END IF;
  UPDATE public.groups SET is_official = _is_official, updated_at = now() WHERE id = _group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_group(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_group_by_invite_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_group(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_group_status(uuid, public.group_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_group_official(uuid, boolean) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_disciplines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_messages TO authenticated;
GRANT ALL ON public.groups TO service_role;
GRANT ALL ON public.group_disciplines TO service_role;
GRANT ALL ON public.group_members TO service_role;
GRANT ALL ON public.group_messages TO service_role;

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_disciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "groups_select" ON public.groups FOR SELECT TO authenticated
  USING (public.can_view_group(id, auth.uid()));
CREATE POLICY "groups_insert" ON public.groups FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "groups_update_admin_group" ON public.groups FOR UPDATE TO authenticated
  USING (public.is_group_admin(id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (
    public.is_admin(auth.uid())
    OR (
      public.is_group_admin(id, auth.uid())
      AND status = (SELECT g.status FROM public.groups g WHERE g.id = groups.id)
      AND is_official = (SELECT g.is_official FROM public.groups g WHERE g.id = groups.id)
    )
  );
CREATE POLICY "groups_delete_owner" ON public.groups FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "group_disciplines_select" ON public.group_disciplines FOR SELECT TO authenticated
  USING (public.can_view_group(group_id, auth.uid()));
CREATE POLICY "group_disciplines_manage" ON public.group_disciplines FOR ALL TO authenticated
  USING (public.is_group_admin(group_id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_group_admin(group_id, auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "group_members_select" ON public.group_members FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "group_members_insert_self_public" ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.status = 'active' AND g.visibility = 'public'
    )
  );
CREATE POLICY "group_members_insert_admin" ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (public.is_group_admin(group_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "group_members_update_admin" ON public.group_members FOR UPDATE TO authenticated
  USING (public.is_group_admin(group_id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_group_admin(group_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "group_members_delete_self_or_admin" ON public.group_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_group_admin(group_id, auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "group_messages_select" ON public.group_messages FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "group_messages_insert" ON public.group_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_user_id = auth.uid() AND public.is_group_member(group_id, auth.uid())
    AND (channel = 'general' OR (channel = 'announcements' AND public.is_group_admin(group_id, auth.uid())))
  );
CREATE POLICY "group_messages_delete" ON public.group_messages FOR DELETE TO authenticated
  USING (sender_user_id = auth.uid() OR public.is_group_admin(group_id, auth.uid()) OR public.is_admin(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
ALTER TABLE public.group_messages REPLICA IDENTITY FULL;

INSERT INTO public.pt_types (name, sort_order) VALUES
  ('HIIT', 11), ('Kettlebell', 12), ('TRX', 13), ('Stretching & Mobility', 14),
  ('Ginnastica Posturale', 15), ('Running', 16), ('Trail Running', 17), ('Ciclismo', 18),
  ('Triathlon', 19), ('Nuoto', 20), ('Boxe', 21), ('Kickboxing', 22), ('MMA', 23),
  ('Arti Marziali', 24), ('Karate', 25), ('Judo', 26), ('Muay Thai', 27), ('Danza', 28),
  ('Zumba', 29), ('Spinning', 30), ('Aerobica', 31), ('Calcio', 32), ('Basket', 33),
  ('Pallavolo', 34), ('Rugby', 35), ('Tennis', 36), ('Padel', 37), ('Atletica Leggera', 38),
  ('Arrampicata', 39), ('Trekking', 40), ('Sci', 41), ('Snowboard', 42),
  ('Ginnastica Artistica', 43), ('EMS - Elettrostimolazione', 44), ('Preparazione Atletica', 45),
  ('Allenamento Femminile', 46), ('Pre & Post Parto', 47), ('Terza Età', 48),
  ('Weightlifting', 49), ('Strongman', 50)
ON CONFLICT (name) DO NOTHING;
