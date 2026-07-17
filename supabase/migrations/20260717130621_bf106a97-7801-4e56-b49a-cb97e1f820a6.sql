DO $$
DECLARE
  v_athlete uuid;
  v_pt uuid;
  v_fallback_pt uuid := '76c207f5-ba7d-48d7-a7f2-c95f4819aebd';
  v_tpl_a uuid; v_tpl_b uuid; v_tpl_c uuid;
  v_blk uuid;
  v_ex1 uuid; v_ex2 uuid; v_ex3 uuid;
  v_program uuid;
  v_assignment uuid;
  v_start date;
  v_week int;
  v_dow int;
  v_slot int := 0;
  v_tpl uuid;
  v_workout uuid;
  v_wblk uuid;
  v_count int := 0;
  r record;
BEGIN
  SELECT user_id INTO v_athlete FROM public.profiles
    WHERE lower(email) = lower('giulia.rossi.atleta@gmail.com') LIMIT 1;
  IF v_athlete IS NULL THEN
    RAISE NOTICE 'Atleta non trovato'; RETURN;
  END IF;

  SELECT pt_user_id INTO v_pt FROM public.pt_atleta_connections
    WHERE atleta_user_id = v_athlete AND status = 'active' LIMIT 1;
  IF v_pt IS NULL THEN v_pt := v_fallback_pt; END IF;

  SELECT id INTO v_ex1 FROM public.exercises WHERE name = 'Affondi con Manubri' AND is_public LIMIT 1;
  SELECT id INTO v_ex2 FROM public.exercises WHERE name = 'Bulgarian Split Squat' AND is_public LIMIT 1;
  SELECT id INTO v_ex3 FROM public.exercises WHERE name = 'Burpees' AND is_public LIMIT 1;

  DELETE FROM public.workouts w
    WHERE w.atleta_user_id = v_athlete
      AND w.template_id IN (
        SELECT id FROM public.workout_templates WHERE pt_user_id = v_pt
          AND title IN ('Giulia A — Full Body Libera','Giulia B — Full Body Propedeutica','Giulia C — Full Body Progressiva')
      );

  FOR r IN SELECT id FROM public.workout_programs
             WHERE pt_user_id = v_pt AND name = 'Giulia — Demo 4 settimane (3 tipologie)' LOOP
    DELETE FROM public.program_assignments WHERE program_id = r.id;
    DELETE FROM public.program_schedules WHERE program_id = r.id;
    DELETE FROM public.workout_programs WHERE id = r.id;
  END LOOP;

  DELETE FROM public.workout_templates
    WHERE pt_user_id = v_pt
      AND title IN ('Giulia A — Full Body Libera','Giulia B — Full Body Propedeutica','Giulia C — Full Body Progressiva');

  INSERT INTO public.workout_templates (pt_user_id, title, description, category, template_kind, difficulty_level)
    VALUES (v_pt, 'Giulia A — Full Body Libera', 'Scheda libera full body', 'full_body', 'libera', 'intermedio')
    RETURNING id INTO v_tpl_a;
  INSERT INTO public.workout_templates (pt_user_id, title, description, category, template_kind, difficulty_level)
    VALUES (v_pt, 'Giulia B — Full Body Propedeutica', 'Scheda propedeutica full body', 'full_body', 'propedeutica', 'intermedio')
    RETURNING id INTO v_tpl_b;
  INSERT INTO public.workout_templates (pt_user_id, title, description, category, template_kind, difficulty_level)
    VALUES (v_pt, 'Giulia C — Full Body Progressiva', 'Scheda progressiva full body', 'full_body', 'progressiva', 'intermedio')
    RETURNING id INTO v_tpl_c;

  FOR r IN SELECT unnest(ARRAY[v_tpl_a, v_tpl_b, v_tpl_c]) AS tpl LOOP
    INSERT INTO public.template_blocks (template_id, order_index, type, name)
      VALUES (r.tpl, 0, 'SET', 'Blocco principale') RETURNING id INTO v_blk;
    INSERT INTO public.template_exercises (template_id, block_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds)
      VALUES
        (r.tpl, v_blk, v_ex1, 0, 3, 8, 12, 60),
        (r.tpl, v_blk, v_ex2, 1, 3, 8, 12, 60),
        (r.tpl, v_blk, v_ex3, 2, 3, 10, 15, 45);
  END LOOP;

  INSERT INTO public.workout_programs (pt_user_id, name, description, duration_weeks, frequency_per_week, active_days, mode)
    VALUES (v_pt, 'Giulia — Demo 4 settimane (3 tipologie)', 'Rotazione A→B→C, Lun/Mer/Ven, 4 settimane', 4, 3, ARRAY[1,3,5], 'recurring')
    RETURNING id INTO v_program;

  v_slot := 0;
  FOR v_week IN 0..3 LOOP
    FOREACH v_dow IN ARRAY ARRAY[1,3,5] LOOP
      v_tpl := (ARRAY[v_tpl_a, v_tpl_b, v_tpl_c])[(v_slot % 3) + 1];
      INSERT INTO public.program_schedules (program_id, template_id, week_offset, day_of_week, order_index)
        VALUES (v_program, v_tpl, v_week, v_dow, v_slot);
      v_slot := v_slot + 1;
    END LOOP;
  END LOOP;

  v_start := (CURRENT_DATE - ((EXTRACT(ISODOW FROM CURRENT_DATE)::int - 1)))::date;
  INSERT INTO public.program_assignments (program_id, pt_user_id, atleta_user_id, start_date, end_date, weeks_generated, active_days, status)
    VALUES (v_program, v_pt, v_athlete, v_start, v_start + 27, 4, ARRAY[1,3,5], 'active')
    RETURNING id INTO v_assignment;

  FOR r IN
    SELECT ps.template_id, ps.week_offset, ps.day_of_week, wt.title, wt.template_kind
      FROM public.program_schedules ps
      JOIN public.workout_templates wt ON wt.id = ps.template_id
     WHERE ps.program_id = v_program
     ORDER BY ps.week_offset, ps.day_of_week
  LOOP
    INSERT INTO public.workouts (atleta_user_id, pt_user_id, template_id, title, scheduled_date, status, template_kind)
      VALUES (v_athlete, v_pt, r.template_id, r.title,
              v_start + (r.week_offset * 7) + (r.day_of_week - 1),
              'attivo', r.template_kind)
      RETURNING id INTO v_workout;

    FOR v_blk IN SELECT id FROM public.template_blocks WHERE template_id = r.template_id ORDER BY order_index LOOP
      INSERT INTO public.workout_blocks (workout_id, order_index, type, name, params, info_note)
        SELECT v_workout, tb.order_index, tb.type, tb.name, tb.params, tb.info_note
          FROM public.template_blocks tb WHERE tb.id = v_blk
        RETURNING id INTO v_wblk;

      INSERT INTO public.workout_exercises
        (workout_id, block_id, exercise_id, order_index, prescribed_sets, prescribed_reps_min, prescribed_reps_max, rest_seconds, prescribed_duration_seconds, sets_data, protocol_type, protocol_params, notes)
        SELECT v_workout, v_wblk, te.exercise_id, te.order_index, te.sets, te.reps_min, te.reps_max, te.rest_seconds, te.prescribed_duration_seconds, te.sets_data, te.protocol_type, te.protocol_params, te.notes
          FROM public.template_exercises te WHERE te.block_id = v_blk ORDER BY te.order_index;
    END LOOP;

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'SEED OK athlete=% pt=% program=% workouts=%', v_athlete, v_pt, v_program, v_count;
END $$;