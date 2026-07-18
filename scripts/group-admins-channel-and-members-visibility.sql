-- Canale Staff (admins) + lista membri per gruppi pubblici
-- Copia su Lovable Cloud SQL editor se la migration non è ancora applicata.

DO $$
BEGIN
  ALTER TYPE public.group_channel ADD VALUE IF NOT EXISTS 'admins';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

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
        OR (
          channel = 'admins'
          AND public.is_group_admin(group_id, auth.uid())
        )
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
      OR (
        channel IN ('announcements', 'admins')
        AND public.is_group_admin(group_id, auth.uid())
      )
    )
  );
