CREATE OR REPLACE FUNCTION public.athlete_redo_workout(_workout_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _src public.workouts%ROWTYPE;
  _new_id uuid;
  _uid uuid := auth.uid();
  _blk record;
  _new_block_id uuid;
  _block_map jsonb := '{}'::jsonb;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;

  IF NOT public.is_atleta(_uid) THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;

  SELECT * INTO _src FROM public.workouts WHERE id = _workout_id FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Allenamento non trovato';
  END IF;

  IF _src.atleta_user_id <> _uid THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;

  IF _src.status <> 'completato' THEN
    RAISE EXCEPTION 'Puoi rifare solo un allenamento già completato';
  END IF;

  IF _src.pt_user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.pt_atleta_connections c
      WHERE c.atleta_user_id = _uid
        AND c.pt_user_id = _src.pt_user_id
        AND c.status = 'active'
        AND COALESCE(c.is_pt_active, true) = true
    ) THEN
      RAISE EXCEPTION 'Non puoi rifare questa scheda: collaborazione non attiva con il Professionista';
    END IF;
  END IF;

  INSERT INTO public.workouts (
    atleta_user_id, pt_user_id, title, description, template_id, template_kind,
    scheduled_date, due_date, status, athlete_reordered_at
  ) VALUES (
    _src.atleta_user_id, _src.pt_user_id, _src.title, _src.description, _src.template_id,
    COALESCE(_src.template_kind, 'libera'), CURRENT_DATE, NULL, 'attivo', NULL
  ) RETURNING id INTO _new_id;

  FOR _blk IN
    SELECT id, order_index, type, name, params, info_note
    FROM public.workout_blocks WHERE workout_id = _src.id ORDER BY order_index
  LOOP
    INSERT INTO public.workout_blocks (workout_id, order_index, type, name, params, info_note)
    VALUES (_new_id, _blk.order_index, _blk.type, _blk.name, COALESCE(_blk.params, '{}'::jsonb), _blk.info_note)
    RETURNING id INTO _new_block_id;

    _block_map := _block_map || jsonb_build_object(_blk.id::text, _new_block_id::text);
  END LOOP;

  INSERT INTO public.workout_exercises (
    workout_id, exercise_id, order_index, prescribed_sets, prescribed_reps_min,
    prescribed_reps_max, prescribed_duration_seconds, prescribed_weight, rest_seconds,
    notes, sets_data, block_id, protocol_type, protocol_params, phase
  )
  SELECT
    _new_id, we.exercise_id, we.order_index, we.prescribed_sets, we.prescribed_reps_min,
    we.prescribed_reps_max, we.prescribed_duration_seconds, we.prescribed_weight,
    COALESCE(we.rest_seconds, 60), we.notes, we.sets_data,
    CASE WHEN we.block_id IS NULL THEN NULL ELSE NULLIF(_block_map ->> we.block_id::text, '')::uuid END,
    COALESCE(we.protocol_type, 'SET'), COALESCE(we.protocol_params, '{}'::jsonb), we.phase
  FROM public.workout_exercises we
  WHERE we.workout_id = _src.id
  ORDER BY we.order_index;

  RETURN _new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.athlete_redo_workout(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.group_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
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

CREATE TABLE IF NOT EXISTS public.group_announcement_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.group_announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_announcement_rsvps_announcement
  ON public.group_announcement_rsvps (announcement_id);

CREATE TABLE IF NOT EXISTS public.group_message_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.group_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_message_likes_message
  ON public.group_message_likes (message_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_announcements TO authenticated;
GRANT ALL ON public.group_announcements TO service_role;
GRANT SELECT, INSERT, DELETE ON public.group_announcement_rsvps TO authenticated;
GRANT ALL ON public.group_announcement_rsvps TO service_role;
GRANT SELECT, INSERT, DELETE ON public.group_message_likes TO authenticated;
GRANT ALL ON public.group_message_likes TO service_role;

ALTER TABLE public.group_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_announcement_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_message_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "group_announcements_select" ON public.group_announcements;
CREATE POLICY "group_announcements_select" ON public.group_announcements FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "group_announcements_insert" ON public.group_announcements;
CREATE POLICY "group_announcements_insert" ON public.group_announcements FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.is_group_admin(group_id, auth.uid()));

DROP POLICY IF EXISTS "group_announcements_update" ON public.group_announcements;
CREATE POLICY "group_announcements_update" ON public.group_announcements FOR UPDATE TO authenticated
  USING (public.is_group_admin(group_id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_group_admin(group_id, auth.uid()) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "group_announcements_delete" ON public.group_announcements;
CREATE POLICY "group_announcements_delete" ON public.group_announcements FOR DELETE TO authenticated
  USING (public.is_group_admin(group_id, auth.uid()) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "group_announcement_rsvps_select" ON public.group_announcement_rsvps;
CREATE POLICY "group_announcement_rsvps_select" ON public.group_announcement_rsvps FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_announcements a WHERE a.id = announcement_id
    AND (public.is_group_member(a.group_id, auth.uid()) OR public.is_admin(auth.uid()))));

DROP POLICY IF EXISTS "group_announcement_rsvps_insert" ON public.group_announcement_rsvps;
CREATE POLICY "group_announcement_rsvps_insert" ON public.group_announcement_rsvps FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.group_announcements a
    WHERE a.id = announcement_id AND public.is_group_member(a.group_id, auth.uid())));

DROP POLICY IF EXISTS "group_announcement_rsvps_delete" ON public.group_announcement_rsvps;
CREATE POLICY "group_announcement_rsvps_delete" ON public.group_announcement_rsvps FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "group_message_likes_select" ON public.group_message_likes;
CREATE POLICY "group_message_likes_select" ON public.group_message_likes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_messages m WHERE m.id = message_id
    AND (public.is_group_member(m.group_id, auth.uid()) OR public.is_admin(auth.uid()))));

DROP POLICY IF EXISTS "group_message_likes_insert" ON public.group_message_likes;
CREATE POLICY "group_message_likes_insert" ON public.group_message_likes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.group_messages m
    WHERE m.id = message_id AND public.is_group_member(m.group_id, auth.uid())));

DROP POLICY IF EXISTS "group_message_likes_delete" ON public.group_message_likes;
CREATE POLICY "group_message_likes_delete" ON public.group_message_likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER update_group_announcements_updated_at
  BEFORE UPDATE ON public.group_announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Users can upload group chat attachments" ON storage.objects;
CREATE POLICY "Users can upload group chat attachments" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'group-chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own group chat attachments" ON storage.objects;
CREATE POLICY "Users can update own group chat attachments" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'group-chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own group chat attachments" ON storage.objects;
CREATE POLICY "Users can delete own group chat attachments" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'group-chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Anyone can read group chat attachments" ON storage.objects;
CREATE POLICY "Anyone can read group chat attachments" ON storage.objects FOR SELECT
  USING (bucket_id = 'group-chat-attachments');