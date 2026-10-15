-- Dati demo per screenshot store e account di revisione Google Play.
-- Account (già registrati): pt@demo.it (Professionista), atleta@demo.it (Atleta).
-- Esegui UNA volta. Date relative a oggi.
DO $$
DECLARE
  v_pt uuid;
  v_at uuid;
  v_chat uuid;
  v_tpl uuid;
  v_blk uuid;
  v_w uuid;
  v_wblk uuid;
  v_we uuid;
  v_ex uuid[];
  t record;
  d int;
  i int;
  s int;
BEGIN
  SELECT user_id INTO v_pt FROM profiles WHERE lower(email) = 'pt@demo.it';
  SELECT user_id INTO v_at FROM profiles WHERE lower(email) = 'atleta@demo.it';
  IF v_pt IS NULL OR v_at IS NULL THEN
    RAISE EXCEPTION 'Account demo non trovati (pt=%, atleta=%)', v_pt, v_at;
  END IF;

  -- Profili
  UPDATE profiles SET first_name = 'Marco', last_name = 'Galli', city = 'Milano' WHERE user_id = v_pt;
  UPDATE profiles SET first_name = 'Giulia', last_name = 'Conti', city = 'Milano' WHERE user_id = v_at;
  UPDATE pt_profiles SET
    status = 'attivo', is_active = true, is_discoverable = true,
    bio = 'Personal trainer certificato, 10 anni di esperienza tra forza, calisthenics e ricomposizione corporea.',
    specializations = ARRAY['Forza', 'Calisthenics', 'Dimagrimento'],
    experience_years = 10, hourly_rate = 45, location_city = 'Milano', location_country = 'Italia',
    offers_online = true, offers_in_person = true
  WHERE user_id = v_pt;
  UPDATE atleta_profiles SET status = 'collegato', fitness_level = 'intermedio',
    goals = ARRAY['Aumentare la forza', 'Migliorare la postura'], height_cm = 168, weight_kg = 61
  WHERE user_id = v_at;

  -- Collegamento PT ↔ atleta (coach primario)
  INSERT INTO pt_atleta_connections (pt_user_id, atleta_user_id, status, requested_by, requested_at, accepted_at, training_modality, is_primary, is_pt_active)
  VALUES (v_pt, v_at, 'active', v_pt, now() - interval '30 days', now() - interval '30 days', 'mix', true, true)
  ON CONFLICT DO NOTHING;

  -- Esercizi dall'archivio pubblico: preferisci quelli senza video YouTube di terzi
  FOR t IN
    SELECT * FROM (VALUES
      (1, 'Full Body Principiante', 'Total body per costruire le basi', 'principiante'::fitness_level, ARRAY['Legs · Squat', 'Push Up', 'Pull up · Australian', 'Core · Plank']),
      (2, 'Push Day — Spinta', 'Petto, spalle e tricipiti a corpo libero', 'intermedio'::fitness_level, ARRAY['Push Up · Diamond', 'Dip · Bar Dips', 'Hspu · Pyke Push Up', 'Push Up · Decline']),
      (3, 'Pull Day — Dorso e Bicipiti', 'Trazioni e tirate a corpo libero', 'intermedio'::fitness_level, ARRAY['Pull up', 'Pull up · Chin Up', 'Pull up · Eccentric', 'Pull up · Australian']),
      (4, 'Gambe & Core', 'Squat, affondi e stabilità', 'intermedio'::fitness_level, ARRAY['Legs · Bulgarian Split Squat', 'Legs · Static Lunges', 'Legs · Squat Jump', 'Core · Side Plank'])
    ) AS x(n, title, descr, lvl, pats)
  LOOP
    -- Nome esatto se c'è, altrimenti il primo che lo contiene
    SELECT array_agg(id ORDER BY o) INTO v_ex FROM (
      SELECT DISTINCT ON (p) p, o, e.id
      FROM unnest(t.pats) WITH ORDINALITY AS u(p, o)
      JOIN exercises e ON e.is_public AND e.name ILIKE '%' || u.p || '%'
      ORDER BY p, lower(e.name) = lower(u.p) DESC, (coalesce(e.video_url, '') ILIKE '%youtu%'), e.name
    ) z;
    -- Riempi fino a 4 con esercizi pubblici qualsiasi
    IF coalesce(array_length(v_ex, 1), 0) < 4 THEN
      SELECT coalesce(v_ex, '{}') || array_agg(id) INTO v_ex FROM (
        SELECT id FROM exercises WHERE is_public AND NOT (id = ANY (coalesce(v_ex, '{}')))
        ORDER BY (coalesce(video_url, '') ILIKE '%youtu%'), name
        LIMIT 4 - coalesce(array_length(v_ex, 1), 0)
      ) f;
    END IF;

    INSERT INTO workout_templates (pt_user_id, title, description, difficulty_level, estimated_duration, template_kind, template_role)
    VALUES (v_pt, t.title, t.descr, t.lvl, 50, 'libera', 'main') RETURNING id INTO v_tpl;
    INSERT INTO template_blocks (template_id, order_index, type, name, params)
    VALUES (v_tpl, 0, 'SET', 'Blocco principale', '{"sets": 4, "reps": 10, "rest_seconds": 90}') RETURNING id INTO v_blk;
    FOR i IN 1..array_length(v_ex, 1) LOOP
      INSERT INTO template_exercises (template_id, block_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, tempo)
      VALUES (v_tpl, v_blk, v_ex[i], i - 1, 4, 8, 12, 90, '3010');
    END LOOP;

    -- Allenamenti assegnati: 3 completati nelle ultime settimane + 1 da fare
    FOR d IN SELECT unnest(ARRAY[21 - t.n, 14 - t.n, 7 - t.n, -t.n + 1]) LOOP
      INSERT INTO workouts (atleta_user_id, pt_user_id, template_id, title, description, scheduled_date, status, completed_at,
                            template_kind, duration_seconds, sets_completed, reps_total, volume_kg, repeat_target, repeat_done)
      VALUES (v_at, v_pt, v_tpl, t.title, t.descr, current_date - d,
              CASE WHEN d > 0 THEN 'completato'::workout_status ELSE 'attivo'::workout_status END,
              CASE WHEN d > 0 THEN (current_date - d) + time '18:30' END,
              'libera',
              CASE WHEN d > 0 THEN 2700 + t.n * 120 END,
              CASE WHEN d > 0 THEN 16 ELSE 0 END,
              CASE WHEN d > 0 THEN 16 * (8 + (21 - d) / 7) ELSE 0 END,
              0,
              1, CASE WHEN d > 0 THEN 1 ELSE 0 END)
      RETURNING id INTO v_w;
      INSERT INTO workout_blocks (workout_id, order_index, type, name, params, phase)
      VALUES (v_w, 0, 'SET', 'Blocco principale', '{"sets": 4, "reps": 10, "rest_seconds": 90}', 'main') RETURNING id INTO v_wblk;
      FOR i IN 1..array_length(v_ex, 1) LOOP
        INSERT INTO workout_exercises (workout_id, block_id, exercise_id, order_index, prescribed_sets, prescribed_reps_min, prescribed_reps_max, rest_seconds, phase)
        VALUES (v_w, v_wblk, v_ex[i], i - 1, 4, 8, 12, 90, 'main') RETURNING id INTO v_we;
        IF d > 0 THEN
          FOR s IN 1..4 LOOP
            INSERT INTO workout_logs (workout_exercise_id, set_number, reps_completed, weight_used, is_completed, rpe, logged_at)
            VALUES (v_we, s, 8 + (21 - d) / 7, NULL, true, 6 + (s / 2), (current_date - d) + time '18:00' + (i * 10 + s * 2) * interval '1 minute');
          END LOOP;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  -- Progressi: 6 settimane
  FOR i IN 0..5 LOOP
    INSERT INTO progress_tracking (atleta_user_id, tracked_date, weight_kg, body_fat_percentage, waist_cm, energy_level, mood_level, sleep_hours, sleep_quality, stress_level)
    VALUES (v_at, current_date - (35 - i * 7), 63.5 - i * 0.5, 26 - i * 0.6, 74 - i * 0.7, 6 + (i / 2), 7 + (i / 3), 7.5, 7, 4);
  END LOOP;

  -- Appuntamenti: questa settimana e la prossima
  INSERT INTO calendar_events (creator_user_id, pt_user_id, atleta_user_id, title, description, event_type, category, visibility, is_public, location, start_datetime, end_datetime, reminder_minutes)
  SELECT v_pt, v_pt, v_at, x.title, x.descr, 'allenamento', 'appuntamento', 'private', false, 'Palestra Livelapp — Milano',
         (current_date + x.dd) + x.hh, (current_date + x.dd) + x.hh + interval '1 hour', 60
  FROM (VALUES
    ('Sessione PT — Forza', 'Push up e dip con il coach', 0, time '18:00'),
    ('Valutazione posturale', 'Check mensile e misure', 2, time '19:00'),
    ('Sessione PT — Pull Day', 'Trazioni ed eccentriche', 4, time '18:30'),
    ('Sessione PT — Gambe & Core', 'Affondi, squat bulgaro, core', 7, time '18:00'),
    ('Check progressi', 'Revisione scheda e obiettivi', 9, time '19:00')
  ) AS x(title, descr, dd, hh);

  -- Chat
  SELECT id INTO v_chat FROM chats WHERE pt_user_id = v_pt AND atleta_user_id = v_at;
  IF v_chat IS NULL THEN
    INSERT INTO chats (pt_user_id, atleta_user_id, is_active) VALUES (v_pt, v_at, true) RETURNING id INTO v_chat;
  END IF;
  INSERT INTO messages (chat_id, sender_user_id, content, is_read, created_at)
  SELECT v_chat, CASE WHEN x.me THEN v_at ELSE v_pt END, x.txt, true, now() - x.ago
  FROM (VALUES
    (false, 'Ciao Giulia! Ti ho caricato la nuova scheda Pull Day, dacci un''occhiata 💪', interval '2 days 3 hours'),
    (true,  'Grazie Marco! La faccio domani dopo il lavoro', interval '2 days 2 hours'),
    (true,  'Fatta! Sono arrivata a 6 trazioni pulite di fila', interval '1 day 4 hours'),
    (false, 'Grande! Settimana prossima puntiamo a 8. Ricordati il recupero di 90 secondi', interval '1 day 3 hours'),
    (true,  'Perfetto, ci vediamo per il Pull Day in palestra?', interval '5 hours'),
    (false, 'Sì, è in calendario alle 18:30. Portati la magnesite!', interval '4 hours')
  ) AS x(me, txt, ago);
  UPDATE chats SET last_message_at = now() - interval '4 hours' WHERE id = v_chat;
END $$;
