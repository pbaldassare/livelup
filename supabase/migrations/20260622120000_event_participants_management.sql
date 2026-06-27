-- Event participants: status waitlist, creator management, PT notification on signup

ALTER TABLE public.event_participants
  DROP CONSTRAINT IF EXISTS event_participants_status_check;

ALTER TABLE public.event_participants
  ADD CONSTRAINT event_participants_status_check
  CHECK (status IN ('registered', 'waitlist', 'cancelled'));

-- Event creator can add/remove/update participants on own events
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

-- Notify event creator when someone registers (not waitlist manual adds by PT)
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
