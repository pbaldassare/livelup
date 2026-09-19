-- Il client chiude il ciclo «N volte» senza scrivere repeat_*.
-- I marker restano in description / notes_atleta così target e fatte
-- sono sempre leggibili anche se la cache API non vede le colonne.

CREATE OR REPLACE FUNCTION public.workouts_apply_repeat_markers()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  target_m text[];
  done_m text[];
  parsed_target integer;
  parsed_done integer;
  has_tick boolean;
  has_done_marker boolean;
  next_done integer;
  next_target integer;
BEGIN
  target_m := regexp_match(COALESCE(NEW.description, ''), '<!--livelapp-repeat:(\d+)-->');
  IF target_m IS NOT NULL THEN
    parsed_target := GREATEST(1, LEAST(60, target_m[1]::integer));
    NEW.repeat_target := GREATEST(COALESCE(NEW.repeat_target, 1), parsed_target);
  END IF;

  has_tick := COALESCE(NEW.notes_atleta, '') LIKE '%<!--livelapp-repeat-tick-->%';
  done_m := regexp_match(COALESCE(NEW.notes_atleta, ''), '<!--livelapp-repeat-done:(\d+)-->');
  has_done_marker := done_m IS NOT NULL;

  IF has_tick THEN
    NEW.notes_atleta := nullif(
      trim(replace(NEW.notes_atleta, '<!--livelapp-repeat-tick-->', '')),
      ''
    );
  END IF;

  next_target := GREATEST(1, COALESCE(NEW.repeat_target, 1));

  IF has_done_marker THEN
    parsed_done := GREATEST(0, LEAST(next_target, done_m[1]::integer));
    NEW.repeat_done := GREATEST(COALESCE(NEW.repeat_done, 0), parsed_done);
  ELSIF has_tick AND TG_OP = 'UPDATE' THEN
    next_done := LEAST(next_target, COALESCE(NEW.repeat_done, 0) + 1);
    NEW.repeat_done := next_done;
    NEW.notes_atleta := CASE
      WHEN NEW.notes_atleta IS NULL OR btrim(NEW.notes_atleta) = ''
        THEN '<!--livelapp-repeat-done:' || next_done || '-->'
      ELSE '<!--livelapp-repeat-done:' || next_done || '--> ' || NEW.notes_atleta
    END;
  END IF;

  next_done := LEAST(next_target, COALESCE(NEW.repeat_done, 0));
  NEW.repeat_done := next_done;

  IF next_target > 1 AND (has_tick OR has_done_marker) THEN
    IF next_done >= next_target THEN
      NEW.status := 'completato';
      NEW.completed_at := COALESCE(NEW.completed_at, now());
    ELSE
      NEW.status := 'in_corso';
      NEW.completed_at := NULL;
    END IF;
  ELSIF next_target <= 1 AND has_tick AND NEW.status IS DISTINCT FROM 'completato' THEN
    NEW.status := 'completato';
    NEW.completed_at := COALESCE(NEW.completed_at, now());
    NEW.repeat_done := 1;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workouts_apply_repeat_markers ON public.workouts;
CREATE TRIGGER workouts_apply_repeat_markers
  BEFORE INSERT OR UPDATE ON public.workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.workouts_apply_repeat_markers();

-- Chiudi d'ufficio i cicli già arrivati a N ma rimasti «da fare».
UPDATE public.workouts
SET
  status = 'completato',
  completed_at = COALESCE(completed_at, now())
WHERE status IN ('in_corso', 'attivo', 'in_sospeso')
  AND COALESCE(repeat_target, 1) > 1
  AND COALESCE(repeat_done, 0) >= repeat_target;

UPDATE public.workouts
SET
  status = 'completato',
  completed_at = COALESCE(completed_at, now()),
  repeat_done = GREATEST(
    COALESCE(repeat_done, 0),
    COALESCE(
      (regexp_match(COALESCE(notes_atleta, ''), '<!--livelapp-repeat-done:(\d+)-->'))[1]::integer,
      0
    )
  )
WHERE status IN ('in_corso', 'attivo', 'in_sospeso')
  AND COALESCE(notes_atleta, '') LIKE '%<!--livelapp-repeat-done:%'
  AND COALESCE(
    (regexp_match(COALESCE(notes_atleta, ''), '<!--livelapp-repeat-done:(\d+)-->'))[1]::integer,
    0
  ) >= GREATEST(
    COALESCE(repeat_target, 1),
    COALESCE(
      (regexp_match(COALESCE(description, ''), '<!--livelapp-repeat:(\d+)-->'))[1]::integer,
      1
    )
  );

-- Allinea le colonne se il marker target è ancora in description.
UPDATE public.workouts
SET repeat_target = GREATEST(
  COALESCE(repeat_target, 1),
  (regexp_match(description, '<!--livelapp-repeat:(\d+)-->'))[1]::integer
)
WHERE description LIKE '%<!--livelapp-repeat:%';
