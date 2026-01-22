-- =============================================
-- FASE 1: ESERCIZI STRETCHING, PILATES, YOGA
-- =============================================

INSERT INTO public.exercises (name, description, instructions, category, muscle_groups, equipment, difficulty_level, video_url, image_url, is_public, created_by)
VALUES
-- STRETCHING (6 esercizi)
('Stretching Quadricipiti', 'Allungamento dei muscoli anteriori della coscia', 
 'In piedi, afferra la caviglia portando il tallone verso il gluteo. Mantieni le ginocchia unite e spingi l''anca in avanti. Tieni la posizione per 30 secondi per lato.',
 'Stretching', ARRAY['quadricipiti', 'flessori anca'], ARRAY[]::text[], 'principiante',
 'https://www.youtube.com/watch?v=YvGQvwLmKHs', '/placeholder.svg', true, NULL),

('Stretching Femorali da Seduto', 'Allungamento dei muscoli posteriori della coscia', 
 'Seduto a terra con una gamba distesa, piega l''altra con la pianta del piede contro la coscia. Inclinati in avanti mantenendo la schiena dritta. Tieni 30 secondi per lato.',
 'Stretching', ARRAY['femorali', 'polpacci'], ARRAY['tappetino'], 'principiante',
 'https://www.youtube.com/watch?v=FDwpEdxZ4H4', '/placeholder.svg', true, NULL),

('Stretching Spalle e Pettorali', 'Apertura della catena anteriore del busto', 
 'In piedi davanti a uno stipite, posiziona l''avambraccio verticalmente e ruota il corpo verso l''esterno. Senti l''allungamento nel pettorale e nella spalla anteriore.',
 'Stretching', ARRAY['pettorali', 'deltoidi anteriori'], ARRAY[]::text[], 'principiante',
 'https://www.youtube.com/watch?v=p85xni-KQFM', '/placeholder.svg', true, NULL),

('Stretching Dorsali', 'Allungamento dei muscoli della schiena', 
 'In ginocchio, siediti sui talloni e distendi le braccia in avanti sul pavimento. Spingi le mani lontano mantenendo i glutei sui talloni. Respira profondamente.',
 'Stretching', ARRAY['dorsali', 'lombari'], ARRAY['tappetino'], 'principiante',
 'https://www.youtube.com/watch?v=g_tea8ZNk5A', '/placeholder.svg', true, NULL),

('Stretching Flessori Anca', 'Allungamento dello psoas e dei flessori dell''anca', 
 'In posizione di affondo con un ginocchio a terra, spingi l''anca in avanti mantenendo il busto eretto. Alza il braccio del lato posteriore per intensificare. 30 secondi per lato.',
 'Stretching', ARRAY['flessori anca', 'quadricipiti'], ARRAY['tappetino'], 'principiante',
 'https://www.youtube.com/watch?v=YQmpO9VT2X4', '/placeholder.svg', true, NULL),

('Stretching Collo e Trapezio', 'Rilassamento della muscolatura cervicale', 
 'Seduto o in piedi, inclina la testa lateralmente portando l''orecchio verso la spalla. Usa la mano per applicare una leggera pressione. Mantieni 20 secondi per lato.',
 'Stretching', ARRAY['trapezio', 'sternocleidomastoideo'], ARRAY[]::text[], 'principiante',
 'https://www.youtube.com/watch?v=wQylqaCl8Zo', '/placeholder.svg', true, NULL),

-- PILATES (6 esercizi)
('The Hundred Pilates', 'Esercizio cardine del Pilates per il core e la respirazione', 
 'Sdraiato supino, solleva testa e spalle. Gambe a 45° o tavolo. Braccia parallele al suolo, pompale su e giù per 100 battiti respirando 5 in e 5 out.',
 'Pilates', ARRAY['addominali', 'core'], ARRAY['tappetino'], 'intermedio',
 'https://www.youtube.com/watch?v=n7GChZfoz9c', '/placeholder.svg', true, NULL),

('Roll Up Pilates', 'Esercizio di articolazione della colonna', 
 'Sdraiato supino con braccia sopra la testa, rotola lentamente fino a sederti, vertebra per vertebra. Tocca le punte dei piedi e torna giù con controllo.',
 'Pilates', ARRAY['addominali', 'flessori anca'], ARRAY['tappetino'], 'intermedio',
 'https://www.youtube.com/watch?v=t4lTny6t1MA', '/placeholder.svg', true, NULL),

('Single Leg Circle', 'Stabilizzazione del bacino con movimento della gamba', 
 'Supino con una gamba al soffitto, disegna cerchi con la punta del piede mantenendo il bacino stabile. 5 cerchi per direzione, poi cambia gamba.',
 'Pilates', ARRAY['addominali', 'flessori anca', 'adduttori'], ARRAY['tappetino'], 'principiante',
 'https://www.youtube.com/watch?v=uy3jQiJbRSM', '/placeholder.svg', true, NULL),

('Swimming Pilates', 'Rinforzo della catena posteriore', 
 'Prono con braccia e gambe distese, solleva alternatamente braccio destro/gamba sinistra e viceversa. Movimento rapido come se nuotassi. 30 secondi.',
 'Pilates', ARRAY['erettori spinali', 'glutei', 'dorsali'], ARRAY['tappetino'], 'intermedio',
 'https://www.youtube.com/watch?v=P2P3eMG6YCs', '/placeholder.svg', true, NULL),

('Teaser Pilates', 'Esercizio avanzato di equilibrio e forza core', 
 'Supino, solleva contemporaneamente busto e gambe formando una V. Braccia parallele alle gambe. Mantieni 3 secondi e scendi con controllo.',
 'Pilates', ARRAY['addominali', 'flessori anca'], ARRAY['tappetino'], 'avanzato',
 'https://www.youtube.com/watch?v=N0WfgW-pVzQ', '/placeholder.svg', true, NULL),

('Side Plank Pilates', 'Stabilizzazione laterale del core', 
 'Appoggiato su avambraccio, solleva il bacino creando una linea retta. Braccio superiore al soffitto. Opzionale: sollevare la gamba superiore. 30 secondi per lato.',
 'Pilates', ARRAY['obliqui', 'core', 'spalle'], ARRAY['tappetino'], 'intermedio',
 'https://www.youtube.com/watch?v=K2VljzCC16g', '/placeholder.svg', true, NULL),

-- YOGA (8 esercizi)
('Saluto al Sole (Surya Namaskar)', 'Sequenza classica di riscaldamento yoga', 
 'Sequenza fluida: Tadasana → Uttanasana → Plank → Chaturanga → Cane a testa in su → Cane a testa in giù → Uttanasana → Tadasana. Ripeti 5-10 volte.',
 'Yoga', ARRAY['tutto il corpo'], ARRAY['tappetino'], 'principiante',
 'https://www.youtube.com/watch?v=AbPufvvYiSw', '/placeholder.svg', true, NULL),

('Cane a Testa in Giù (Adho Mukha Svanasana)', 'Posizione fondamentale di allungamento', 
 'Da quattro zampe, solleva il bacino verso l''alto formando una V rovesciata. Spingi i talloni verso terra e le spalle lontano dalle orecchie. Tieni 5-10 respiri.',
 'Yoga', ARRAY['femorali', 'polpacci', 'spalle', 'dorsali'], ARRAY['tappetino'], 'principiante',
 'https://www.youtube.com/watch?v=EC7RGJ975iM', '/placeholder.svg', true, NULL),

('Guerriero 1 (Virabhadrasana I)', 'Posizione di forza e apertura', 
 'Affondo profondo con piede posteriore a 45°. Braccia al cielo, palmi uniti. Bacino squadrato in avanti, sguardo alle mani. 5 respiri per lato.',
 'Yoga', ARRAY['quadricipiti', 'flessori anca', 'spalle'], ARRAY['tappetino'], 'principiante',
 'https://www.youtube.com/watch?v=k4qaVoAbeHM', '/placeholder.svg', true, NULL),

('Guerriero 2 (Virabhadrasana II)', 'Posizione di stabilità e apertura laterale', 
 'Gambe larghe, piede anteriore a 90°, posteriore parallelo. Piega il ginocchio anteriore, braccia parallele al suolo. Sguardo sulla mano anteriore.',
 'Yoga', ARRAY['quadricipiti', 'adduttori', 'spalle'], ARRAY['tappetino'], 'principiante',
 'https://www.youtube.com/watch?v=QvGcDMnvOqU', '/placeholder.svg', true, NULL),

('Albero (Vrksasana)', 'Posizione di equilibrio su una gamba', 
 'In piedi su una gamba, posiziona il piede opposto sulla coscia interna (mai sul ginocchio). Mani in preghiera al petto o sopra la testa. 30 secondi per lato.',
 'Yoga', ARRAY['core', 'caviglie', 'glutei'], ARRAY['tappetino'], 'principiante',
 'https://www.youtube.com/watch?v=wdln9qWYloU', '/placeholder.svg', true, NULL),

('Piccione (Eka Pada Rajakapotasana)', 'Apertura profonda delle anche', 
 'Da cane a testa in giù, porta un ginocchio in avanti. Gamba posteriore distesa. Inclina il busto in avanti sugli avambracci o a terra. 1-2 minuti per lato.',
 'Yoga', ARRAY['glutei', 'flessori anca', 'piriforme'], ARRAY['tappetino'], 'intermedio',
 'https://www.youtube.com/watch?v=_4F-6L4CarU', '/placeholder.svg', true, NULL),

('Cobra (Bhujangasana)', 'Estensione della colonna e apertura toracica', 
 'Prono con mani sotto le spalle, solleva il petto usando i muscoli della schiena (non spingere troppo con le mani). Gomiti vicini al corpo. Tieni 5 respiri.',
 'Yoga', ARRAY['erettori spinali', 'pettorali', 'addominali'], ARRAY['tappetino'], 'principiante',
 'https://www.youtube.com/watch?v=fOdrW7nf9gw', '/placeholder.svg', true, NULL),

('Posizione del Bambino (Balasana)', 'Posizione di riposo e rilassamento', 
 'Seduto sui talloni, inclina il busto in avanti con braccia distese o lungo i fianchi. Fronte a terra. Respira profondamente e rilassa tutto il corpo.',
 'Yoga', ARRAY['dorsali', 'spalle', 'fianchi'], ARRAY['tappetino'], 'principiante',
 'https://www.youtube.com/watch?v=2MJGg-dUKh0', '/placeholder.svg', true, NULL);

-- =============================================
-- FASE 2: 10 WORKOUT TEMPLATES COMPLETI
-- =============================================

-- Nota: I template usano pt_user_id placeholder che andranno aggiornati dopo la registrazione manuale
-- Per ora li creiamo con l'admin come owner temporaneo (andrà modificato)

-- Prima recuperiamo alcuni ID esercizi per i template
DO $$
DECLARE
  -- Esercizi forza
  v_squat UUID;
  v_bench UUID;
  v_deadlift UUID;
  v_shoulder_press UUID;
  v_lat_pulldown UUID;
  v_leg_press UUID;
  v_bicep_curl UUID;
  v_tricep_extension UUID;
  v_lunges UUID;
  v_rows UUID;
  
  -- Esercizi cardio
  v_jumping_jacks UUID;
  v_burpees UUID;
  v_mountain_climbers UUID;
  v_high_knees UUID;
  v_box_jump UUID;
  
  -- Esercizi core
  v_plank UUID;
  v_crunches UUID;
  v_russian_twist UUID;
  v_leg_raises UUID;
  v_hundred UUID;
  v_side_plank UUID;
  
  -- Esercizi yoga/stretching
  v_sun_salutation UUID;
  v_downward_dog UUID;
  v_warrior1 UUID;
  v_warrior2 UUID;
  v_child_pose UUID;
  v_quad_stretch UUID;
  v_hip_flexor UUID;
  
  -- Template IDs
  v_template1 UUID;
  v_template2 UUID;
  v_template3 UUID;
  v_template4 UUID;
  v_template5 UUID;
  v_template6 UUID;
  v_template7 UUID;
  v_template8 UUID;
  v_template9 UUID;
  v_template10 UUID;
  
  -- Admin user per owner temporaneo
  v_admin_id UUID;
  
BEGIN
  -- Recupera admin ID
  SELECT user_id INTO v_admin_id FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  
  -- Recupera ID esercizi
  SELECT id INTO v_squat FROM exercises WHERE name ILIKE '%squat%' AND name NOT ILIKE '%jump%' LIMIT 1;
  SELECT id INTO v_bench FROM exercises WHERE name ILIKE '%panca%' OR name ILIKE '%bench%' LIMIT 1;
  SELECT id INTO v_deadlift FROM exercises WHERE name ILIKE '%stacco%' OR name ILIKE '%deadlift%' LIMIT 1;
  SELECT id INTO v_shoulder_press FROM exercises WHERE name ILIKE '%military%' OR name ILIKE '%shoulder%' LIMIT 1;
  SELECT id INTO v_lat_pulldown FROM exercises WHERE name ILIKE '%lat pull%' OR name ILIKE '%pulldown%' LIMIT 1;
  SELECT id INTO v_leg_press FROM exercises WHERE name ILIKE '%leg press%' LIMIT 1;
  SELECT id INTO v_bicep_curl FROM exercises WHERE name ILIKE '%curl%' AND name ILIKE '%bicip%' LIMIT 1;
  SELECT id INTO v_tricep_extension FROM exercises WHERE name ILIKE '%french%' OR name ILIKE '%tricip%' LIMIT 1;
  SELECT id INTO v_lunges FROM exercises WHERE name ILIKE '%affond%' OR name ILIKE '%lunge%' LIMIT 1;
  SELECT id INTO v_rows FROM exercises WHERE name ILIKE '%rematore%' OR name ILIKE '%row%' LIMIT 1;
  
  SELECT id INTO v_jumping_jacks FROM exercises WHERE name ILIKE '%jumping jack%' LIMIT 1;
  SELECT id INTO v_burpees FROM exercises WHERE name ILIKE '%burpee%' LIMIT 1;
  SELECT id INTO v_mountain_climbers FROM exercises WHERE name ILIKE '%mountain%' LIMIT 1;
  SELECT id INTO v_high_knees FROM exercises WHERE name ILIKE '%ginocchia%' OR name ILIKE '%high knee%' LIMIT 1;
  SELECT id INTO v_box_jump FROM exercises WHERE name ILIKE '%box jump%' OR name ILIKE '%salto%' LIMIT 1;
  
  SELECT id INTO v_plank FROM exercises WHERE name ILIKE '%plank%' AND name NOT ILIKE '%side%' LIMIT 1;
  SELECT id INTO v_crunches FROM exercises WHERE name ILIKE '%crunch%' LIMIT 1;
  SELECT id INTO v_russian_twist FROM exercises WHERE name ILIKE '%russian%' OR name ILIKE '%twist%' LIMIT 1;
  SELECT id INTO v_leg_raises FROM exercises WHERE name ILIKE '%leg raise%' OR name ILIKE '%gambe sospese%' LIMIT 1;
  SELECT id INTO v_hundred FROM exercises WHERE name ILIKE '%hundred%' LIMIT 1;
  SELECT id INTO v_side_plank FROM exercises WHERE name ILIKE '%side plank%' LIMIT 1;
  
  SELECT id INTO v_sun_salutation FROM exercises WHERE name ILIKE '%saluto al sole%' OR name ILIKE '%surya%' LIMIT 1;
  SELECT id INTO v_downward_dog FROM exercises WHERE name ILIKE '%cane%testa%giù%' OR name ILIKE '%adho%' LIMIT 1;
  SELECT id INTO v_warrior1 FROM exercises WHERE name ILIKE '%guerriero 1%' OR name ILIKE '%virabhadrasana i%' LIMIT 1;
  SELECT id INTO v_warrior2 FROM exercises WHERE name ILIKE '%guerriero 2%' OR name ILIKE '%virabhadrasana ii%' LIMIT 1;
  SELECT id INTO v_child_pose FROM exercises WHERE name ILIKE '%bambino%' OR name ILIKE '%balasana%' LIMIT 1;
  SELECT id INTO v_quad_stretch FROM exercises WHERE name ILIKE '%quadricipiti%' AND category = 'Stretching' LIMIT 1;
  SELECT id INTO v_hip_flexor FROM exercises WHERE name ILIKE '%flessori anca%' AND category = 'Stretching' LIMIT 1;

  -- Se mancano esercizi, usa fallback
  IF v_plank IS NULL THEN SELECT id INTO v_plank FROM exercises LIMIT 1; END IF;
  IF v_squat IS NULL THEN SELECT id INTO v_squat FROM exercises LIMIT 1; END IF;
  
  -- =============================================
  -- CREAZIONE 10 WORKOUT TEMPLATES
  -- =============================================
  
  -- Template 1: Full Body Principiante
  INSERT INTO workout_templates (pt_user_id, title, description, category, difficulty_level, estimated_duration, is_public, tags)
  VALUES (v_admin_id, 'Full Body Principiante', 'Allenamento completo per chi inizia. Esercizi base per tutto il corpo con focus sulla tecnica corretta.', 'Full Body', 'principiante', 30, true, ARRAY['principiante', 'full body', 'base'])
  RETURNING id INTO v_template1;
  
  -- Template 2: Push Day Intermedio
  INSERT INTO workout_templates (pt_user_id, title, description, category, difficulty_level, estimated_duration, is_public, tags)
  VALUES (v_admin_id, 'Push Day Intermedio', 'Giornata dedicata ai muscoli di spinta: petto, spalle e tricipiti. Ideale per split push/pull/legs.', 'Upper Body', 'intermedio', 45, true, ARRAY['push', 'petto', 'spalle', 'tricipiti'])
  RETURNING id INTO v_template2;
  
  -- Template 3: Pull Day Intermedio
  INSERT INTO workout_templates (pt_user_id, title, description, category, difficulty_level, estimated_duration, is_public, tags)
  VALUES (v_admin_id, 'Pull Day Intermedio', 'Giornata dedicata ai muscoli di trazione: schiena e bicipiti. Complementare al Push Day.', 'Upper Body', 'intermedio', 45, true, ARRAY['pull', 'schiena', 'bicipiti', 'dorsali'])
  RETURNING id INTO v_template3;
  
  -- Template 4: Lower Body Power
  INSERT INTO workout_templates (pt_user_id, title, description, category, difficulty_level, estimated_duration, is_public, tags)
  VALUES (v_admin_id, 'Lower Body Power', 'Allenamento intenso per gambe e glutei. Squat, stacchi e varianti per massima forza.', 'Lower Body', 'intermedio', 50, true, ARRAY['gambe', 'glutei', 'forza', 'power'])
  RETURNING id INTO v_template4;
  
  -- Template 5: HIIT Cardio Blast
  INSERT INTO workout_templates (pt_user_id, title, description, category, difficulty_level, estimated_duration, is_public, tags)
  VALUES (v_admin_id, 'HIIT Cardio Blast', 'Allenamento ad alta intensità per bruciare calorie e migliorare la resistenza cardiovascolare.', 'Cardio', 'intermedio', 25, true, ARRAY['hiit', 'cardio', 'brucia grassi', 'metabolico'])
  RETURNING id INTO v_template5;
  
  -- Template 6: Core & Abs Focus
  INSERT INTO workout_templates (pt_user_id, title, description, category, difficulty_level, estimated_duration, is_public, tags)
  VALUES (v_admin_id, 'Core & Abs Focus', 'Sessione dedicata al rinforzo del core. Esercizi per addominali, obliqui e stabilità.', 'Core', 'intermedio', 30, true, ARRAY['core', 'addominali', 'stabilità'])
  RETURNING id INTO v_template6;
  
  -- Template 7: Yoga Flow Rilassante
  INSERT INTO workout_templates (pt_user_id, title, description, category, difficulty_level, estimated_duration, is_public, tags)
  VALUES (v_admin_id, 'Yoga Flow Rilassante', 'Sequenza yoga per rilassamento e flessibilità. Perfetta per recupero attivo o fine giornata.', 'Yoga', 'principiante', 40, true, ARRAY['yoga', 'relax', 'flessibilità', 'mindfulness'])
  RETURNING id INTO v_template7;
  
  -- Template 8: Pilates Core Strength
  INSERT INTO workout_templates (pt_user_id, title, description, category, difficulty_level, estimated_duration, is_public, tags)
  VALUES (v_admin_id, 'Pilates Core Strength', 'Lezione Pilates focalizzata sulla forza del core e controllo del movimento.', 'Pilates', 'intermedio', 35, true, ARRAY['pilates', 'core', 'postura', 'controllo'])
  RETURNING id INTO v_template8;
  
  -- Template 9: Bodyweight Only
  INSERT INTO workout_templates (pt_user_id, title, description, category, difficulty_level, estimated_duration, is_public, tags)
  VALUES (v_admin_id, 'Bodyweight Only', 'Allenamento completo senza attrezzi. Perfetto per casa o viaggi.', 'Funzionale', 'principiante', 30, true, ARRAY['bodyweight', 'casa', 'no attrezzi', 'funzionale'])
  RETURNING id INTO v_template9;
  
  -- Template 10: Stretching Completo
  INSERT INTO workout_templates (pt_user_id, title, description, category, difficulty_level, estimated_duration, is_public, tags)
  VALUES (v_admin_id, 'Stretching Completo', 'Routine di stretching per tutto il corpo. Ideale post-allenamento o per migliorare la mobilità.', 'Stretching', 'principiante', 25, true, ARRAY['stretching', 'mobilità', 'recupero', 'flessibilità'])
  RETURNING id INTO v_template10;

  -- =============================================
  -- ASSOCIAZIONE ESERCIZI AI TEMPLATES
  -- =============================================
  
  -- Template 1: Full Body Principiante (5 esercizi)
  IF v_squat IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template1, v_squat, 1, 3, 10, 12, 60, 'Focus sulla tecnica, ginocchia in linea con le punte');
  END IF;
  IF v_bench IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template1, v_bench, 2, 3, 10, 12, 60, 'Scapole addotte, arco lombare naturale');
  END IF;
  IF v_rows IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template1, v_rows, 3, 3, 10, 12, 60, 'Tira verso l''ombelico, contrai i dorsali');
  END IF;
  IF v_plank IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template1, v_plank, 4, 3, 30, 45, 45, 'Tempo in secondi, mantieni la linea del corpo');
  END IF;
  IF v_lunges IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template1, v_lunges, 5, 3, 8, 10, 60, 'Per gamba, passo ampio');
  END IF;

  -- Template 2: Push Day (6 esercizi)
  IF v_bench IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template2, v_bench, 1, 4, 8, 10, 90, 'Esercizio principale, carico progressivo');
  END IF;
  IF v_shoulder_press IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template2, v_shoulder_press, 2, 4, 8, 10, 90, 'Core attivo, non inarcare');
  END IF;
  IF v_tricep_extension IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template2, v_tricep_extension, 3, 3, 10, 12, 60, 'Gomiti fermi, movimento controllato');
  END IF;

  -- Template 3: Pull Day (5 esercizi)
  IF v_deadlift IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template3, v_deadlift, 1, 4, 6, 8, 120, 'Schiena neutra, spingi con le gambe');
  END IF;
  IF v_lat_pulldown IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template3, v_lat_pulldown, 2, 4, 10, 12, 60, 'Tira al petto, scapole depresse');
  END IF;
  IF v_rows IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template3, v_rows, 3, 3, 10, 12, 60, 'Contrai al picco del movimento');
  END IF;
  IF v_bicep_curl IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template3, v_bicep_curl, 4, 3, 12, 15, 45, 'Supinazione al picco');
  END IF;

  -- Template 4: Lower Body Power (5 esercizi)
  IF v_squat IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template4, v_squat, 1, 5, 5, 5, 120, 'Carico pesante, tecnica perfetta');
  END IF;
  IF v_deadlift IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template4, v_deadlift, 2, 4, 6, 6, 120, 'Romanian o conventional');
  END IF;
  IF v_leg_press IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template4, v_leg_press, 3, 4, 10, 12, 90, 'Piedi alti per glutei, bassi per quad');
  END IF;
  IF v_lunges IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template4, v_lunges, 4, 3, 10, 12, 60, 'Walking lunges o sul posto');
  END IF;

  -- Template 5: HIIT Cardio Blast (6 esercizi)
  IF v_jumping_jacks IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template5, v_jumping_jacks, 1, 4, 30, 30, 15, '30 secondi lavoro, 15 riposo');
  END IF;
  IF v_burpees IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template5, v_burpees, 2, 4, 10, 10, 20, 'Massima esplosività');
  END IF;
  IF v_mountain_climbers IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template5, v_mountain_climbers, 3, 4, 30, 30, 15, '30 secondi, ritmo alto');
  END IF;
  IF v_high_knees IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template5, v_high_knees, 4, 4, 30, 30, 15, 'Ginocchia al petto');
  END IF;

  -- Template 6: Core & Abs Focus (6 esercizi)
  IF v_plank IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template6, v_plank, 1, 3, 45, 60, 30, 'Tempo in secondi');
  END IF;
  IF v_crunches IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template6, v_crunches, 2, 3, 15, 20, 30, 'Controllo, no slancio');
  END IF;
  IF v_russian_twist IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template6, v_russian_twist, 3, 3, 20, 20, 30, 'Per lato, con o senza peso');
  END IF;
  IF v_leg_raises IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template6, v_leg_raises, 4, 3, 12, 15, 30, 'Schiena a terra');
  END IF;
  IF v_side_plank IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template6, v_side_plank, 5, 3, 30, 30, 30, '30 sec per lato');
  END IF;

  -- Template 7: Yoga Flow (6 esercizi)
  IF v_sun_salutation IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template7, v_sun_salutation, 1, 5, 1, 1, 0, '5 round completi');
  END IF;
  IF v_downward_dog IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template7, v_downward_dog, 2, 1, 60, 60, 0, 'Mantieni 1 minuto');
  END IF;
  IF v_warrior1 IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template7, v_warrior1, 3, 2, 30, 30, 0, '30 sec per lato');
  END IF;
  IF v_warrior2 IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template7, v_warrior2, 4, 2, 30, 30, 0, '30 sec per lato');
  END IF;
  IF v_child_pose IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template7, v_child_pose, 5, 1, 120, 120, 0, 'Rilassamento finale 2 min');
  END IF;

  -- Template 8: Pilates Core (5 esercizi)
  IF v_hundred IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template8, v_hundred, 1, 1, 100, 100, 30, '100 pompaggi totali');
  END IF;
  IF v_side_plank IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template8, v_side_plank, 2, 2, 30, 30, 15, 'Per lato, controllo');
  END IF;

  -- Template 9: Bodyweight Only (6 esercizi)
  IF v_squat IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template9, v_squat, 1, 3, 15, 20, 45, 'Bodyweight, profondo');
  END IF;
  IF v_lunges IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template9, v_lunges, 2, 3, 12, 12, 45, 'Per gamba');
  END IF;
  IF v_plank IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template9, v_plank, 3, 3, 45, 60, 30, 'Secondi');
  END IF;
  IF v_mountain_climbers IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template9, v_mountain_climbers, 4, 3, 20, 20, 30, 'Per gamba');
  END IF;
  IF v_burpees IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template9, v_burpees, 5, 3, 10, 10, 45, 'Full burpees');
  END IF;

  -- Template 10: Stretching Completo (6 esercizi)
  IF v_quad_stretch IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template10, v_quad_stretch, 1, 2, 30, 30, 0, '30 sec per gamba');
  END IF;
  IF v_hip_flexor IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template10, v_hip_flexor, 2, 2, 30, 30, 0, '30 sec per lato');
  END IF;
  IF v_downward_dog IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template10, v_downward_dog, 3, 1, 60, 60, 0, '1 minuto');
  END IF;
  IF v_child_pose IS NOT NULL THEN
    INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes)
    VALUES (v_template10, v_child_pose, 4, 1, 60, 60, 0, 'Rilassamento');
  END IF;

END $$;