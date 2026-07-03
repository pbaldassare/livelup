ALTER TABLE public.event_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id uuid REFERENCES public.event_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS event_comments_parent_idx
  ON public.event_comments(parent_comment_id);

-- Prevent nesting beyond 1 level (a reply cannot itself be a reply)
CREATE OR REPLACE FUNCTION public.event_comments_enforce_single_level()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_parent_parent uuid;
BEGIN
  IF NEW.parent_comment_id IS NOT NULL THEN
    SELECT parent_comment_id INTO v_parent_parent
    FROM public.event_comments
    WHERE id = NEW.parent_comment_id;
    IF v_parent_parent IS NOT NULL THEN
      RAISE EXCEPTION 'Le risposte non possono essere ulteriormente annidate';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS event_comments_single_level ON public.event_comments;
CREATE TRIGGER event_comments_single_level
  BEFORE INSERT OR UPDATE ON public.event_comments
  FOR EACH ROW EXECUTE FUNCTION public.event_comments_enforce_single_level();