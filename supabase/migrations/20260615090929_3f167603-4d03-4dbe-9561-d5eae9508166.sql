
DO $$ BEGIN
  CREATE TYPE public.calendar_event_category AS ENUM ('evento', 'appuntamento');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS category public.calendar_event_category;

UPDATE public.calendar_events
SET category = CASE
  WHEN atleta_user_id IS NOT NULL THEN 'appuntamento'::public.calendar_event_category
  ELSE 'evento'::public.calendar_event_category
END
WHERE category IS NULL;

ALTER TABLE public.calendar_events
  ALTER COLUMN category SET NOT NULL,
  ALTER COLUMN category SET DEFAULT 'evento';

CREATE OR REPLACE FUNCTION public.calendar_events_validate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.category = 'appuntamento' AND NEW.atleta_user_id IS NULL THEN
    RAISE EXCEPTION 'Un appuntamento deve avere un atleta associato';
  END IF;
  IF NEW.category = 'evento' AND NEW.atleta_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Un evento pubblico non puo'' avere un atleta specifico';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_calendar_events_validate ON public.calendar_events;
CREATE TRIGGER trg_calendar_events_validate
  BEFORE INSERT OR UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.calendar_events_validate();

CREATE INDEX IF NOT EXISTS idx_calendar_events_pt_cat_start
  ON public.calendar_events (pt_user_id, category, start_datetime);
