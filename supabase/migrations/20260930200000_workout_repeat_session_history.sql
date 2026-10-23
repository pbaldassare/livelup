-- =====================================================
-- «N volte in totale»: ogni sessione finisce nello storico
--
-- Prima: a metà ciclo i workout_logs venivano cancellati e il PT
-- vedeva lo storico solo dopo l'ultima sessione.
-- Ora: a ogni sessione non finale si crea una copia `completato`
-- della scheda (blocchi + esercizi) e i log della sessione vengono
-- SPOSTATI sulla copia. La scheda madre resta `in_corso` col contatore.
-- L'ultima sessione chiude la madre come prima: N sessioni = N righe
-- `completato` nello storico.
--
-- Marker sulla copia (description):
--   <!--livelapp-repeat-session:K/N:<uuid scheda madre>-->
-- repeat_target = 1 sulla copia: non compare mai tra le schede da fare.
--
-- Conteggi: la copia passa a `completato` con un UPDATE, quindi i trigger
-- esistenti (decremento pacchetto sessioni, badge) scattano una volta per
-- sessione svolta. È voluto: ogni sessione è un allenamento reale.
-- =====================================================

CREATE OR REPLACE FUNCTION public.strip_workout_repeat_markers(_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT nullif(
    btrim(regexp_replace(
      regexp_replace(COALESCE(_text, ''), '<!--livelapp-repeat[^>]*-->', '', 'g'),
      '\s+', ' ', 'g'
    )),
    ''
  );
$$;

REVOKE ALL ON FUNCTION public.strip_workout_repeat_markers(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.strip_workout_repeat_markers(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.strip_workout_repeat_markers(text) TO service_role;

-- Crea la copia storica di una sessione e sposta lì i log.
CREATE OR REPLACE FUNCTION public.snapshot_workout_repeat_session(
  _workout_id uuid,
  _session integer,
  _target integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w public.workouts%ROWTYPE;
  snap_id uuid := gen_random_uuid();
  block_map jsonb := '{}'::jsonb;
  b public.workout_blocks%ROWTYPE;
  e public.workout_exercises%ROWTYPE;
  new_block_id uuid;
  new_ex_id uuid;
  body text;
BEGIN
  SELECT * INTO w FROM public.workouts WHERE id = _workout_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  body := public.strip_workout_repeat_markers(w.description);

  INSERT INTO public.workouts (
    id, atleta_user_id, pt_user_id, template_id, title, description,
    scheduled_date, due_date, status, notes_pt, notes_atleta, rating,
    template_kind, athlete_reordered_at, duration_seconds, sets_completed,
    reps_total, volume_kg, repeat_target, repeat_done
  ) VALUES (
    snap_id, w.atleta_user_id, w.pt_user_id, w.template_id, w.title,
    concat_ws(' ',
      '<!--livelapp-repeat-session:' || _session || '/' || _target || ':' || w.id || '-->',
      body),
    (now() AT TIME ZONE 'Europe/Rome')::date, w.due_date, 'in_corso', w.notes_pt,
    public.strip_workout_repeat_markers(w.notes_atleta), w.rating,
    w.template_kind, w.athlete_reordered_at, w.duration_seconds, w.sets_completed,
    w.reps_total, w.volume_kg, 1, 0
  );

  FOR b IN
    SELECT * FROM public.workout_blocks WHERE workout_id = _workout_id
  LOOP
    new_block_id := gen_random_uuid();
    INSERT INTO public.workout_blocks (
      id, workout_id, order_index, type, name, params, info_note, phase, library_protocol_id
    ) VALUES (
      new_block_id, snap_id, b.order_index, b.type, b.name, b.params, b.info_note, b.phase,
      b.library_protocol_id
    );
    block_map := block_map || jsonb_build_object(b.id::text, new_block_id);
  END LOOP;

  FOR e IN
    SELECT * FROM public.workout_exercises WHERE workout_id = _workout_id
  LOOP
    new_ex_id := gen_random_uuid();
    INSERT INTO public.workout_exercises (
      id, workout_id, exercise_id, order_index, prescribed_sets, prescribed_reps_min,
      prescribed_reps_max, prescribed_weight, rest_seconds, notes, block_id,
      prescribed_duration_seconds, sets_data, protocol_type, protocol_params, phase,
      protocol_name, library_protocol_id
    ) VALUES (
      new_ex_id, snap_id, e.exercise_id, e.order_index, e.prescribed_sets, e.prescribed_reps_min,
      e.prescribed_reps_max, e.prescribed_weight, e.rest_seconds, e.notes,
      CASE WHEN e.block_id IS NULL THEN NULL ELSE (block_map ->> e.block_id::text)::uuid END,
      e.prescribed_duration_seconds, e.sets_data, e.protocol_type, e.protocol_params, e.phase,
      e.protocol_name, e.library_protocol_id
    );

    UPDATE public.workout_logs
    SET workout_exercise_id = new_ex_id
    WHERE workout_exercise_id = e.id;
  END LOOP;

  -- UPDATE (non INSERT diretto a completato): fa scattare badge,
  -- decremento pacchetto e notifica PT come per qualsiasi completamento.
  UPDATE public.workouts
  SET status = 'completato', completed_at = now()
  WHERE id = snap_id;

  RETURN snap_id;
END;
$$;

REVOKE ALL ON FUNCTION public.snapshot_workout_repeat_session(uuid, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.snapshot_workout_repeat_session(uuid, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.snapshot_workout_repeat_session(uuid, integer, integer) TO service_role;

-- Sostituisce il vecchio reset: invece di cancellare i log li archivia.
CREATE OR REPLACE FUNCTION public.workouts_reset_logs_mid_repeat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status = 'in_corso'
     AND COALESCE(NEW.repeat_done, 0) > COALESCE(OLD.repeat_done, 0)
     AND COALESCE(NEW.repeat_done, 0) < COALESCE(NEW.repeat_target, 1)
  THEN
    PERFORM public.snapshot_workout_repeat_session(
      NEW.id,
      COALESCE(NEW.repeat_done, 0),
      COALESCE(NEW.repeat_target, 1)
    );

    -- Rete di sicurezza: la scheda madre riparte sempre da zero log.
    DELETE FROM public.workout_logs
    WHERE workout_exercise_id IN (
      SELECT we.id FROM public.workout_exercises we WHERE we.workout_id = NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.workouts_reset_logs_mid_repeat() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.workouts_reset_logs_mid_repeat() FROM anon, authenticated;

DROP TRIGGER IF EXISTS workouts_reset_logs_mid_repeat ON public.workouts;
CREATE TRIGGER workouts_reset_logs_mid_repeat
  AFTER UPDATE ON public.workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.workouts_reset_logs_mid_repeat();

-- RPC legacy (non usata dal client): non cancella più i log,
-- ci pensa il trigger sopra con lo snapshot.
CREATE OR REPLACE FUNCTION public.apply_workout_repeat_completion(workout_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w public.workouts%ROWTYPE;
  new_done integer;
  finished boolean;
  new_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;

  SELECT * INTO w
  FROM public.workouts
  WHERE id = apply_workout_repeat_completion.workout_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Allenamento non trovato';
  END IF;

  IF w.atleta_user_id <> auth.uid()
     AND w.pt_user_id <> auth.uid()
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Non autorizzato a completare questa scheda';
  END IF;

  IF w.status = 'completato' THEN
    RETURN jsonb_build_object(
      'repeat_done', COALESCE(w.repeat_done, 0),
      'repeat_target', COALESCE(w.repeat_target, 1),
      'finished', true,
      'status', w.status
    );
  END IF;

  new_done := LEAST(COALESCE(w.repeat_target, 1), COALESCE(w.repeat_done, 0) + 1);
  finished := new_done >= COALESCE(w.repeat_target, 1);
  new_status := CASE WHEN finished THEN 'completato' ELSE 'in_corso' END;

  UPDATE public.workouts
  SET
    repeat_done = new_done,
    status = new_status::public.workout_status,
    completed_at = CASE WHEN finished THEN now() ELSE NULL END
  WHERE id = w.id;

  RETURN jsonb_build_object(
    'repeat_done', new_done,
    'repeat_target', COALESCE(w.repeat_target, 1),
    'finished', finished,
    'status', new_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_workout_repeat_completion(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_workout_repeat_completion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_workout_repeat_completion(uuid) TO service_role;

-- =====================================================
-- Notifica al Professionista a ogni allenamento completato
-- (anche ogni singola sessione di «N volte»).
-- Nessuna notifica se è il PT stesso a registrare per l'atleta.
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_pt_workout_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  athlete_name text;
  session_m text[];
  session_no integer;
  session_target integer;
  progress text := '';
BEGIN
  IF NEW.status <> 'completato'
     OR OLD.status = 'completato'
     OR NEW.pt_user_id IS NULL
     OR NEW.pt_user_id = auth.uid()
  THEN
    RETURN NEW;
  END IF;

  SELECT NULLIF(btrim(concat_ws(' ', p.first_name, p.last_name)), '') INTO athlete_name
  FROM public.profiles p
  WHERE p.user_id = NEW.atleta_user_id;

  session_m := regexp_match(
    COALESCE(NEW.description, ''),
    '<!--livelapp-repeat-session:(\d+)/(\d+):'
  );
  IF session_m IS NOT NULL THEN
    session_no := session_m[1]::integer;
    session_target := session_m[2]::integer;
  ELSIF COALESCE(NEW.repeat_target, 1) > 1 THEN
    session_no := COALESCE(NEW.repeat_done, NEW.repeat_target);
    session_target := NEW.repeat_target;
  END IF;

  IF session_target IS NOT NULL AND session_target > 1 THEN
    progress := ' (' || session_no || '/' || session_target || ')';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data, action_url)
  VALUES (
    NEW.pt_user_id,
    'workout_completed',
    COALESCE(athlete_name, 'Il tuo atleta') || ' ha completato ' || NEW.title || progress,
    'Apri lo storico per vedere set, carichi e note della sessione.',
    jsonb_build_object(
      'workout_id', NEW.id,
      'atleta_user_id', NEW.atleta_user_id,
      'session', session_no,
      'session_target', session_target
    ),
    '/pt/athletes/' || NEW.atleta_user_id
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_pt_workout_completed() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_pt_workout_completed() FROM anon, authenticated;

DROP TRIGGER IF EXISTS notify_pt_workout_completed ON public.workouts;
CREATE TRIGGER notify_pt_workout_completed
  AFTER UPDATE ON public.workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_pt_workout_completed();

NOTIFY pgrst, 'reload schema';
