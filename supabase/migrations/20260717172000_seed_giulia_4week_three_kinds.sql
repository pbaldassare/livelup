-- =============================================================================
-- Seed: programma 4 settimane per giulia.rossi.atleta@gmail.com
-- 3 schede/settimana × 4 settimane, tipi libera / propedeutica / progressiva
-- Max 3 esercizi per scheda. Idempotente.
-- =============================================================================

ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS template_kind text NOT NULL DEFAULT 'libera';
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS template_kind text NOT NULL DEFAULT 'libera';

DO $$
DECLARE
  v_athlete_email TEXT := 'giulia.rossi.atleta@gmail.com';
  v_pt_fallback UUID := '76c207f5-ba7d-48d7-a7f2-c95f4819aebd'; -- Marco Ferrari
  v_athlete UUID;
  v_pt UUID;
  v_program_name TEXT := 'Giulia — Demo 4 settimane (3 tipologie)';
  v_seed_tag TEXT := '[seed:giulia-4w-kinds]';
  v_title_a TEXT := 'Giulia A — Full Body Libera';
  v_title_b TEXT := 'Giulia B — Full Body Propedeutica';
  v_title_c TEXT := 'Giulia C — Full Body Progressiva';
  v_tpl_libera UUID;
  v_tpl_prop UUID;
  v_tpl_prog UUID;
  v_program UUID;
  v_assignment UUID;
  v_ex UUID[] := ARRAY[]::UUID[];
  v_ex_a UUID[];
  v_ex_b UUID[];
  v_ex_c UUID[];
  v_start DATE := CURRENT_DATE;
  v_end DATE;
  v_active INT[] := ARRAY[1, 3, 5];
  v_dates DATE[] := ARRAY[]::DATE[];
  v_d DATE;
  v_cursor DATE;
  v_iso INT;
  v_i INT;
  v_tpl UUID;
  v_kind TEXT;
  v_title TEXT;
  v_workout UUID;
  v_created INT := 0;
BEGIN
  SELECT p.user_id INTO v_athlete
  FROM public.profiles p
  WHERE lower(p.email) = lower(v_athlete_email)
  LIMIT 1;

  IF v_athlete IS NULL THEN
    RAISE EXCEPTION 'Atleta % non trovato', v_athlete_email;
  END IF;

  SELECT c.pt_user_id INTO v_pt
  FROM public.pt_atleta_connections c
  WHERE c.atleta_user_id = v_athlete
    AND c.status = 'active'
  ORDER BY c.updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_pt IS NULL THEN
    v_pt := v_pt_fallback;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_pt) THEN
      RAISE EXCEPTION 'Nessun PT attivo per atleta e fallback Marco Ferrari assente';
    END IF;

    INSERT INTO public.pt_atleta_connections (
      pt_user_id, atleta_user_id, status, requested_by, accepted_at
    ) VALUES (
      v_pt, v_athlete, 'active', v_pt, NOW()
    )
    ON CONFLICT (pt_user_id, atleta_user_id) DO UPDATE SET
      status = 'active',
      terminated_at = NULL,
      accepted_at = COALESCE(public.pt_atleta_connections.accepted_at, NOW()),
      updated_at = NOW();
  END IF;

  SELECT ARRAY_AGG(id) INTO v_ex
  FROM (
    SELECT id FROM public.exercises ORDER BY created_at NULLS LAST, name LIMIT 20
  ) e;

  IF v_ex IS NULL OR cardinality(v_ex) < 3 THEN
    RAISE EXCEPTION 'Servono almeno 3 esercizi in catalogo';
  END IF;

  WHILE cardinality(v_ex) < 9 LOOP
    v_ex := v_ex || v_ex[1];
  END LOOP;

  v_ex_a := ARRAY[v_ex[1], v_ex[2], v_ex[3]];
  v_ex_b := ARRAY[v_ex[4], v_ex[5], v_ex[6]];
  v_ex_c := ARRAY[v_ex[7], v_ex[8], v_ex[9]];

  -- A libera
  SELECT id INTO v_tpl_libera
  FROM public.workout_templates
  WHERE pt_user_id = v_pt AND title = v_title_a
  LIMIT 1;

  IF v_tpl_libera IS NULL THEN
    INSERT INTO public.workout_templates (
      pt_user_id, title, description, category, difficulty_level,
      estimated_duration, is_public, tags, template_kind
    ) VALUES (
      v_pt, v_title_a,
      v_seed_tag || ' Scheda libera: puoi riordinare gli esercizi prima di partire.',
      'funzionale', 'intermedio', 35, false,
      ARRAY['seed', 'giulia', 'libera'], 'libera'
    ) RETURNING id INTO v_tpl_libera;
  ELSE
    UPDATE public.workout_templates
    SET template_kind = 'libera',
        description = v_seed_tag || ' Scheda libera: puoi riordinare gli esercizi prima di partire.',
        updated_at = NOW()
    WHERE id = v_tpl_libera;
    DELETE FROM public.template_exercises WHERE template_id = v_tpl_libera;
  END IF;

  INSERT INTO public.template_exercises (
    template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, protocol_type, protocol_params
  )
  SELECT v_tpl_libera, v_ex_a[i], i, 3, 10, 12, 60, 'SET', '{}'::jsonb
  FROM generate_series(1, 3) AS i;

  -- B propedeutica
  SELECT id INTO v_tpl_prop
  FROM public.workout_templates
  WHERE pt_user_id = v_pt AND title = v_title_b
  LIMIT 1;

  IF v_tpl_prop IS NULL THEN
    INSERT INTO public.workout_templates (
      pt_user_id, title, description, category, difficulty_level,
      estimated_duration, is_public, tags, template_kind
    ) VALUES (
      v_pt, v_title_b,
      v_seed_tag || ' Scheda propedeutica: ordine fisso, puoi continuare anche se incompleta.',
      'funzionale', 'intermedio', 35, false,
      ARRAY['seed', 'giulia', 'propedeutica'], 'propedeutica'
    ) RETURNING id INTO v_tpl_prop;
  ELSE
    UPDATE public.workout_templates
    SET template_kind = 'propedeutica',
        description = v_seed_tag || ' Scheda propedeutica: ordine fisso, puoi continuare anche se incompleta.',
        updated_at = NOW()
    WHERE id = v_tpl_prop;
    DELETE FROM public.template_exercises WHERE template_id = v_tpl_prop;
  END IF;

  INSERT INTO public.template_exercises (
    template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, protocol_type, protocol_params
  )
  SELECT v_tpl_prop, v_ex_b[i], i, 3, 10, 12, 60, 'SET', '{}'::jsonb
  FROM generate_series(1, 3) AS i;

  -- C progressiva
  SELECT id INTO v_tpl_prog
  FROM public.workout_templates
  WHERE pt_user_id = v_pt AND title = v_title_c
  LIMIT 1;

  IF v_tpl_prog IS NULL THEN
    INSERT INTO public.workout_templates (
      pt_user_id, title, description, category, difficulty_level,
      estimated_duration, is_public, tags, template_kind
    ) VALUES (
      v_pt, v_title_c,
      v_seed_tag || ' Scheda progressiva: completa al 100% ogni esercizio prima del successivo.',
      'funzionale', 'intermedio', 35, false,
      ARRAY['seed', 'giulia', 'progressiva'], 'progressiva'
    ) RETURNING id INTO v_tpl_prog;
  ELSE
    UPDATE public.workout_templates
    SET template_kind = 'progressiva',
        description = v_seed_tag || ' Scheda progressiva: completa al 100% ogni esercizio prima del successivo.',
        updated_at = NOW()
    WHERE id = v_tpl_prog;
    DELETE FROM public.template_exercises WHERE template_id = v_tpl_prog;
  END IF;

  INSERT INTO public.template_exercises (
    template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, protocol_type, protocol_params
  )
  SELECT v_tpl_prog, v_ex_c[i], i, 3, 8, 8, 60, 'SET', '{}'::jsonb
  FROM generate_series(1, 3) AS i;

  UPDATE public.program_assignments pa
  SET status = 'cancelled', updated_at = NOW()
  FROM public.workout_programs wp
  WHERE pa.program_id = wp.id
    AND wp.pt_user_id = v_pt
    AND wp.name = v_program_name
    AND pa.atleta_user_id = v_athlete
    AND pa.status = 'active';

  UPDATE public.workout_programs
  SET is_archived = true, updated_at = NOW()
  WHERE pt_user_id = v_pt
    AND name = v_program_name
    AND is_archived = false;

  DELETE FROM public.workout_exercises we
  USING public.workouts w
  WHERE we.workout_id = w.id
    AND w.atleta_user_id = v_athlete
    AND w.pt_user_id = v_pt
    AND w.description = v_seed_tag;

  DELETE FROM public.workouts
  WHERE atleta_user_id = v_athlete
    AND pt_user_id = v_pt
    AND description = v_seed_tag;

  INSERT INTO public.workout_programs (
    pt_user_id, name, description, duration_weeks, frequency_per_week,
    active_days, mode, notes
  ) VALUES (
    v_pt,
    v_program_name,
    v_seed_tag || ' Rotazione A libera → B propedeutica → C progressiva, 3×/settimana × 4 settimane.',
    4, 3, v_active, 'recurring', v_seed_tag
  ) RETURNING id INTO v_program;

  INSERT INTO public.program_schedules (program_id, template_id, day_of_week, week_offset, order_index)
  VALUES
    (v_program, v_tpl_libera, 1, 0, 0),
    (v_program, v_tpl_prop, 1, 0, 1),
    (v_program, v_tpl_prog, 1, 0, 2);

  v_end := v_start + (4 * 7 - 1);

  INSERT INTO public.program_assignments (
    program_id, pt_user_id, atleta_user_id, start_date, end_date,
    weeks_generated, current_index, active_days, status, notes
  ) VALUES (
    v_program, v_pt, v_athlete, v_start, v_end,
    4, 0, v_active, 'active', v_seed_tag
  ) RETURNING id INTO v_assignment;

  v_dates := ARRAY[v_start];
  v_cursor := v_start + 1;
  WHILE v_cursor < v_start + (4 * 7) LOOP
    v_iso := EXTRACT(ISODOW FROM v_cursor)::INT;
    IF v_iso = ANY (v_active) THEN
      v_dates := v_dates || v_cursor;
    END IF;
    v_cursor := v_cursor + 1;
  END LOOP;

  FOR v_i IN 1 .. cardinality(v_dates) LOOP
    v_d := v_dates[v_i];
    IF ((v_i - 1) % 3) = 0 THEN
      v_tpl := v_tpl_libera; v_kind := 'libera'; v_title := v_title_a;
    ELSIF ((v_i - 1) % 3) = 1 THEN
      v_tpl := v_tpl_prop; v_kind := 'propedeutica'; v_title := v_title_b;
    ELSE
      v_tpl := v_tpl_prog; v_kind := 'progressiva'; v_title := v_title_c;
    END IF;

    INSERT INTO public.workouts (
      atleta_user_id, pt_user_id, title, description, template_id,
      template_kind, scheduled_date, due_date, status
    ) VALUES (
      v_athlete, v_pt, v_title, v_seed_tag, v_tpl,
      v_kind, v_d, v_d, 'attivo'
    ) RETURNING id INTO v_workout;

    INSERT INTO public.workout_exercises (
      workout_id, exercise_id, order_index, prescribed_sets,
      prescribed_reps_min, prescribed_reps_max, rest_seconds,
      protocol_type, protocol_params, notes
    )
    SELECT
      v_workout,
      te.exercise_id,
      te.order_index,
      te.sets,
      te.reps_min,
      te.reps_max,
      COALESCE(te.rest_seconds, 60),
      COALESCE(te.protocol_type, 'SET'),
      COALESCE(te.protocol_params, '{}'::jsonb),
      te.notes
    FROM public.template_exercises te
    WHERE te.template_id = v_tpl
    ORDER BY te.order_index;

    v_created := v_created + 1;
  END LOOP;

  UPDATE public.program_assignments
  SET current_index = cardinality(v_dates) % 3,
      weeks_generated = 4,
      updated_at = NOW()
  WHERE id = v_assignment;

  INSERT INTO public.notifications (user_id, type, title, body, action_url, data)
  VALUES (
    v_athlete,
    'program_assigned',
    'Nuovo programma di allenamento!',
    'Il tuo Coach ti ha assegnato il programma "' || v_program_name || '"',
    '/app/scheda',
    jsonb_build_object('pt_user_id', v_pt, 'program_id', v_program)
  );

  RAISE NOTICE 'OK athlete=% pt=% program=% workouts=%', v_athlete, v_pt, v_program, v_created;
END $$;
