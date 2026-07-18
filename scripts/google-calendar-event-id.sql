-- Same as supabase/migrations/20260718200000_google_calendar_event_id.sql
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS google_event_id text;

COMMENT ON COLUMN public.calendar_events.google_event_id IS
  'Google Calendar event id when synced via google-calendar-sync edge function.';

CREATE INDEX IF NOT EXISTS idx_calendar_events_google_event_id
  ON public.calendar_events(google_event_id)
  WHERE google_event_id IS NOT NULL;
