-- Event comments: PT creator can view/delete on own events; notify PT on new comment

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
