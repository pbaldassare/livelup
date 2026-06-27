
-- 1) event_participants management
ALTER TABLE public.event_participants
  DROP CONSTRAINT IF EXISTS event_participants_status_check;
ALTER TABLE public.event_participants
  ADD CONSTRAINT event_participants_status_check
  CHECK (status IN ('registered', 'waitlist', 'cancelled'));

DROP POLICY IF EXISTS "Event creator can insert participants" ON public.event_participants;
CREATE POLICY "Event creator can insert participants"
  ON public.event_participants FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendar_events ce
      WHERE ce.id = event_id AND ce.creator_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Event creator can delete participants" ON public.event_participants;
CREATE POLICY "Event creator can delete participants"
  ON public.event_participants FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_events ce
      WHERE ce.id = event_id AND ce.creator_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Event creator can update participants" ON public.event_participants;
CREATE POLICY "Event creator can update participants"
  ON public.event_participants FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_events ce
      WHERE ce.id = event_id AND ce.creator_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendar_events ce
      WHERE ce.id = event_id AND ce.creator_user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.notify_event_creator_on_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id UUID;
  v_event_title TEXT;
  v_registrant_name TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM 'registered' THEN
    RETURN NEW;
  END IF;
  SELECT ce.creator_user_id, ce.title
  INTO v_creator_id, v_event_title
  FROM public.calendar_events ce
  WHERE ce.id = NEW.event_id;
  IF v_creator_id IS NULL OR v_creator_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  SELECT TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))
  INTO v_registrant_name
  FROM public.profiles p
  WHERE p.user_id = NEW.user_id;
  IF v_registrant_name IS NULL OR v_registrant_name = '' THEN
    v_registrant_name := 'Un atleta';
  END IF;
  INSERT INTO public.notifications (user_id, type, title, body, action_url, data)
  VALUES (
    v_creator_id,
    'event_registration',
    'Nuova iscrizione evento',
    v_registrant_name || ' si è iscritto a "' || COALESCE(v_event_title, 'Evento') || '".',
    '/pt/calendar/eventi/' || NEW.event_id::text,
    jsonb_build_object('event_id', NEW.event_id, 'participant_user_id', NEW.user_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_event_participant_registered ON public.event_participants;
CREATE TRIGGER on_event_participant_registered
  AFTER INSERT ON public.event_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_event_creator_on_registration();

-- 2) event_comments PT policies
DROP POLICY IF EXISTS "Anyone can view comments on public events" ON public.event_comments;
DROP POLICY IF EXISTS "View comments on public or own events" ON public.event_comments;
CREATE POLICY "View comments on public or own events"
  ON public.event_comments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_events ce
      WHERE ce.id = event_comments.event_id
        AND (ce.is_public = true OR ce.creator_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Event creator can delete comments" ON public.event_comments;
CREATE POLICY "Event creator can delete comments"
  ON public.event_comments FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.calendar_events ce
      WHERE ce.id = event_comments.event_id
        AND ce.creator_user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.notify_event_creator_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id UUID;
  v_event_title TEXT;
  v_author_name TEXT;
BEGIN
  SELECT ce.creator_user_id, ce.title
  INTO v_creator_id, v_event_title
  FROM public.calendar_events ce
  WHERE ce.id = NEW.event_id;
  IF v_creator_id IS NULL OR v_creator_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  SELECT TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))
  INTO v_author_name
  FROM public.profiles p
  WHERE p.user_id = NEW.user_id;
  IF v_author_name IS NULL OR v_author_name = '' THEN
    v_author_name := 'Qualcuno';
  END IF;
  INSERT INTO public.notifications (user_id, type, title, body, action_url, data)
  VALUES (
    v_creator_id,
    'event_comment',
    'Nuovo commento evento',
    v_author_name || ' ha commentato "' || COALESCE(v_event_title, 'Evento') || '".',
    '/pt/events/' || NEW.event_id::text,
    jsonb_build_object('event_id', NEW.event_id, 'comment_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_event_comment_created ON public.event_comments;
CREATE TRIGGER on_event_comment_created
  AFTER INSERT ON public.event_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_event_creator_on_comment();

-- 3) workout_templates: difficulty_level default 'nessuno'
ALTER TABLE public.workout_templates
  ALTER COLUMN difficulty_level SET DEFAULT 'nessuno';
