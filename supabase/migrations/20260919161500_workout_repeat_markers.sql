-- Il client non può scrivere repeat_* finché la cache API non le vede.
-- Marker in description / notes_atleta: il trigger applica il contatore in Postgres.

CREATE OR REPLACE FUNCTION public.workouts_apply_repeat_markers()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  m text[];
  t integer;
  new_done integer;
BEGIN
  IF TG_OP = 'INSERT'
     OR (TG_OP = 'UPDATE' AND NEW.description IS DISTINCT FROM OLD.description)
  THEN
    m := regexp_match(COALESCE(NEW.description, ''), '<!--livelapp-repeat:(\d+)-->');
    IF m IS NOT NULL THEN
      t := GREATEST(1, LEAST(60, m[1]::integer));
      NEW.repeat_target := t;
      NEW.repeat_done := 0;
      NEW.description := nullif(
        trim(regexp_replace(NEW.description, '\s*<!--livelapp-repeat:\d+-->\s*', ' ', 'g')),
        ''
      );
    END IF;
  END IF;

  IF TG_OP = 'UPDATE'
     AND COALESCE(NEW.notes_atleta, '') LIKE '%<!--livelapp-repeat-tick-->%'
  THEN
    NEW.notes_atleta := nullif(
      trim(replace(NEW.notes_atleta, '<!--livelapp-repeat-tick-->', '')),
      ''
    );
    IF NEW.status IS DISTINCT FROM 'completato' THEN
      new_done := LEAST(COALESCE(NEW.repeat_target, 1), COALESCE(NEW.repeat_done, 0) + 1);
      NEW.repeat_done := new_done;
      IF new_done >= COALESCE(NEW.repeat_target, 1) THEN
        NEW.status := 'completato';
        NEW.completed_at := now();
      ELSE
        NEW.status := 'in_corso';
        NEW.completed_at := NULL;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workouts_apply_repeat_markers ON public.workouts;
CREATE TRIGGER workouts_apply_repeat_markers
  BEFORE INSERT OR UPDATE ON public.workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.workouts_apply_repeat_markers();

CREATE OR REPLACE FUNCTION public.workouts_reset_logs_mid_repeat()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status = 'in_corso'
     AND COALESCE(NEW.repeat_done, 0) > COALESCE(OLD.repeat_done, 0)
     AND COALESCE(NEW.repeat_done, 0) < COALESCE(NEW.repeat_target, 1)
  THEN
    DELETE FROM public.workout_logs
    WHERE workout_exercise_id IN (
      SELECT we.id FROM public.workout_exercises we WHERE we.workout_id = NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workouts_reset_logs_mid_repeat ON public.workouts;
CREATE TRIGGER workouts_reset_logs_mid_repeat
  AFTER UPDATE ON public.workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.workouts_reset_logs_mid_repeat();
