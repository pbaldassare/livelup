-- =====================================================
-- PT coach access to community groups owned by connected athletes
-- =====================================================
-- Scope: a PT can view / chat / manage community groups (public.groups) that
-- they own OR that are owned by an athlete with an active pt_atleta_connection.
-- Does NOT open unrelated public groups beyond existing can_view_group rules.
-- =====================================================

-- Helper: PT is coach of a group (owner OR active connection to owner athlete)
CREATE OR REPLACE FUNCTION public.is_pt_coach_of_group(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.groups g
    WHERE g.id = _group_id
      AND g.status = 'active'
      AND (
        g.owner_user_id = _user_id
        OR EXISTS (
          SELECT 1
          FROM public.pt_atleta_connections c
          WHERE c.pt_user_id = _user_id
            AND c.atleta_user_id = g.owner_user_id
            AND c.status = 'active'
        )
      )
  );
$$;

COMMENT ON FUNCTION public.is_pt_coach_of_group(uuid, uuid) IS
  'True if user owns the community group or is the active PT of the group owner athlete';

GRANT EXECUTE ON FUNCTION public.is_pt_coach_of_group(uuid, uuid) TO authenticated;

-- Extend visibility: PT coach can see athlete-owned private groups
CREATE OR REPLACE FUNCTION public.can_view_group(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = _group_id
      AND (
        public.is_admin(_user_id)
        OR (g.status = 'active' AND g.visibility = 'public')
        OR public.is_group_member(_group_id, _user_id)
        OR public.is_pt_coach_of_group(_group_id, _user_id)
      )
  );
$$;

-- Optional RPC: list only PT-owned + athlete-owned groups (scoped, no public leak)
CREATE OR REPLACE FUNCTION public.get_pt_relevant_groups()
RETURNS SETOF public.groups
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.*
  FROM public.groups g
  WHERE g.status = 'active'
    AND (
      g.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.pt_atleta_connections c
        WHERE c.pt_user_id = auth.uid()
          AND c.atleta_user_id = g.owner_user_id
          AND c.status = 'active'
      )
    )
  ORDER BY g.updated_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_pt_relevant_groups() TO authenticated;

-- groups UPDATE: coach can manage (cannot flip status/is_official unless admin)
DROP POLICY IF EXISTS "groups_update_admin_group" ON public.groups;
CREATE POLICY "groups_update_admin_group"
  ON public.groups FOR UPDATE TO authenticated
  USING (
    public.is_group_admin(id, auth.uid())
    OR public.is_pt_coach_of_group(id, auth.uid())
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR (
      (
        public.is_group_admin(id, auth.uid())
        OR public.is_pt_coach_of_group(id, auth.uid())
      )
      AND status = (SELECT g.status FROM public.groups g WHERE g.id = groups.id)
      AND is_official = (SELECT g.is_official FROM public.groups g WHERE g.id = groups.id)
    )
  );

-- group_members SELECT: coach can list members of coached groups
DROP POLICY IF EXISTS "group_members_select" ON public.group_members;
CREATE POLICY "group_members_select"
  ON public.group_members FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.is_group_member(group_id, auth.uid())
    OR public.is_pt_coach_of_group(group_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_members.group_id
        AND g.status = 'active'
        AND g.visibility = 'public'
    )
  );

-- group_members INSERT/UPDATE/DELETE: coach can manage members
DROP POLICY IF EXISTS "group_members_insert_admin" ON public.group_members;
CREATE POLICY "group_members_insert_admin"
  ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (
    public.is_group_admin(group_id, auth.uid())
    OR public.is_pt_coach_of_group(group_id, auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "group_members_update_admin" ON public.group_members;
CREATE POLICY "group_members_update_admin"
  ON public.group_members FOR UPDATE TO authenticated
  USING (
    public.is_group_admin(group_id, auth.uid())
    OR public.is_pt_coach_of_group(group_id, auth.uid())
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    public.is_group_admin(group_id, auth.uid())
    OR public.is_pt_coach_of_group(group_id, auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "group_members_delete_self_or_admin" ON public.group_members;
CREATE POLICY "group_members_delete_self_or_admin"
  ON public.group_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_group_admin(group_id, auth.uid())
    OR public.is_pt_coach_of_group(group_id, auth.uid())
    OR public.is_admin(auth.uid())
  );

-- group_disciplines manage for coach
DROP POLICY IF EXISTS "group_disciplines_manage" ON public.group_disciplines;
CREATE POLICY "group_disciplines_manage"
  ON public.group_disciplines FOR ALL TO authenticated
  USING (
    public.is_group_admin(group_id, auth.uid())
    OR public.is_pt_coach_of_group(group_id, auth.uid())
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    public.is_group_admin(group_id, auth.uid())
    OR public.is_pt_coach_of_group(group_id, auth.uid())
    OR public.is_admin(auth.uid())
  );

-- Messages: coach can read/write general, announcements and admins (staff)
DROP POLICY IF EXISTS "group_messages_select" ON public.group_messages;
CREATE POLICY "group_messages_select"
  ON public.group_messages FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR (
      public.is_group_member(group_id, auth.uid())
      AND (
        channel IN ('general', 'announcements')
        OR (
          channel = 'admins'
          AND public.is_group_admin(group_id, auth.uid())
        )
      )
    )
    OR (
      public.is_pt_coach_of_group(group_id, auth.uid())
      AND channel IN ('general', 'announcements', 'admins')
    )
  );

DROP POLICY IF EXISTS "group_messages_insert" ON public.group_messages;
CREATE POLICY "group_messages_insert"
  ON public.group_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_user_id = auth.uid()
    AND (
      (
        public.is_group_member(group_id, auth.uid())
        AND (
          channel = 'general'
          OR (
            channel IN ('announcements', 'admins')
            AND public.is_group_admin(group_id, auth.uid())
          )
        )
      )
      OR (
        public.is_pt_coach_of_group(group_id, auth.uid())
        AND channel IN ('general', 'announcements', 'admins')
      )
    )
  );

-- Profiles of members in coached (incl. private) groups
DROP POLICY IF EXISTS "PT coach can view coached group member profiles" ON public.profiles;
CREATE POLICY "PT coach can view coached group member profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.group_members gm
      WHERE gm.user_id = profiles.user_id
        AND gm.status = 'active'
        AND public.is_pt_coach_of_group(gm.group_id, auth.uid())
    )
  );
