-- =========================================================
-- 1) template_kind columns + atleta reorder RPC
-- =========================================================
ALTER TABLE public.workout_templates ADD COLUMN IF NOT EXISTS template_kind TEXT;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS template_kind TEXT;

CREATE OR REPLACE FUNCTION public.atleta_reorder_workout_exercises(
  _workout_id UUID,
  _ordered_exercise_ids UUID[]
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _atleta UUID;
  _uid UUID := auth.uid();
  _i INT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT atleta_user_id INTO _atleta FROM public.workouts WHERE id = _workout_id;
  IF _atleta IS NULL THEN RAISE EXCEPTION 'Workout not found'; END IF;
  IF _atleta <> _uid THEN RAISE EXCEPTION 'Not authorized'; END IF;

  FOR _i IN 1..array_length(_ordered_exercise_ids, 1) LOOP
    UPDATE public.workout_exercises
      SET order_index = _i - 1
      WHERE id = _ordered_exercise_ids[_i]
        AND workout_id = _workout_id;
  END LOOP;
END;
$fn$;

-- =========================================================
-- 2) CHECK constraint: template_kind ∈ (libera, propedeutica, progressiva)
-- =========================================================
ALTER TABLE public.workout_templates DROP CONSTRAINT IF EXISTS workout_templates_template_kind_check;
ALTER TABLE public.workout_templates ADD CONSTRAINT workout_templates_template_kind_check
  CHECK (template_kind IS NULL OR template_kind IN ('libera','propedeutica','progressiva'));

ALTER TABLE public.workouts DROP CONSTRAINT IF EXISTS workouts_template_kind_check;
ALTER TABLE public.workouts ADD CONSTRAINT workouts_template_kind_check
  CHECK (template_kind IS NULL OR template_kind IN ('libera','propedeutica','progressiva'));

-- =========================================================
-- 3) Idempotent seed for kato.aifp@gmail.com
-- =========================================================
DO $seed$
DECLARE
  _atleta UUID;
  _pt UUID;
  _fallback_pt UUID := '76c207f5-ba7d-48d7-a7f2-c95f4819aebd';
  _tpl_a UUID; _tpl_b UUID; _tpl_c UUID;
  _prog UUID;
  _assign UUID;
  _ex_ids UUID[];
  _ex1 UUID; _ex2 UUID; _ex3 UUID;
  _start DATE;
  _wk INT; _dow INT; _idx INT := 0;
  _tpl_kinds TEXT[]  := ARRAY['libera','propedeutica','progressiva'];
  _tpl_titles TEXT[] := ARRAY['A — Full Body Libera','B — Full Body Propedeutica','C — Full Body Progressiva'];
  _tpl_id UUID; _tpl_kind TEXT; _tpl_title TEXT;
  _workout_id UUID;
  _active_days INT[] := ARRAY[1,3,5];
  _created INT := 0;
  _tpl_iter UUID;
BEGIN
  SELECT user_id INTO _atleta FROM public.profiles WHERE lower(email) = 'kato.aifp@gmail.com' LIMIT 1;
  IF _atleta IS NULL THEN
    RAISE NOTICE 'Seed skipped: atleta kato.aifp@gmail.com non trovato';
    RETURN;
  END IF;

  SELECT pt_user_id INTO _pt FROM public.pt_atleta_connections
    WHERE atleta_user_id = _atleta AND status = 'active' LIMIT 1;
  IF _pt IS NULL THEN _pt := _fallback_pt; END IF;

  SELECT array_agg(id ORDER BY name) INTO _ex_ids FROM (
    SELECT id, name FROM public.exercises WHERE is_public = true ORDER BY name LIMIT 3
  ) s;
  _ex1 := _ex_ids[1]; _ex2 := _ex_ids[2]; _ex3 := _ex_ids[3];
  IF _ex1 IS NULL OR _ex2 IS NULL OR _ex3 IS NULL THEN
    RAISE EXCEPTION 'Non ci sono almeno 3 esercizi pubblici per il seed';
  END IF;

  -- Archive previous seeded program & clean generated workouts
  UPDATE public.workout_programs SET is_archived = true, updated_at = now()
    WHERE pt_user_id = _pt AND name = 'Demo 4 settimane — 3 tipologie' AND is_archived = false;

  DELETE FROM public.workouts
    WHERE atleta_user_id = _atleta AND pt_user_id = _pt
      AND COALESCE(notes_pt,'') LIKE '%[seed:kato-4week]%';

  -- Fresh templates
  INSERT INTO public.workout_templates (pt_user_id, title, description, template_kind, is_public)
    VALUES (_pt, _tpl_titles[1], 'Seed demo — libera',      'libera',       false) RETURNING id INTO _tpl_a;
  INSERT INTO public.workout_templates (pt_user_id, title, description, template_kind, is_public)
    VALUES (_pt, _tpl_titles[2], 'Seed demo — propedeutica','propedeutica', false) RETURNING id INTO _tpl_b;
  INSERT INTO public.workout_templates (pt_user_id, title, description, template_kind, is_public)
    VALUES (_pt, _tpl_titles[3], 'Seed demo — progressiva', 'progressiva',  false) RETURNING id INTO _tpl_c;

  FOREACH _tpl_iter IN ARRAY ARRAY[_tpl_a, _tpl_b, _tpl_c] LOOP
    INSERT INTO public.template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds)
      VALUES (_tpl_iter, _ex1, 0, 3, 8, 12, 90),
             (_tpl_iter, _ex2, 1, 3, 8, 12, 90),
             (_tpl_iter, _ex3, 2, 3, 8, 12, 90);
  END LOOP;

  -- Program
  INSERT INTO public.workout_programs (pt_user_id, name, description, duration_weeks, frequency_per_week, active_days, mode)
    VALUES (_pt, 'Demo 4 settimane — 3 tipologie', 'Rotazione A→B→C, Lun/Mer/Ven per 4 settimane', 4, 3, _active_days, 'rotation')
    RETURNING id INTO _prog;

  INSERT INTO public.program_schedules (program_id, template_id, day_of_week, week_offset, order_index)
    VALUES (_prog, _tpl_a, 1, 0, 0),
           (_prog, _tpl_b, 3, 0, 1),
           (_prog, _tpl_c, 5, 0, 2);

  _start := date_trunc('week', CURRENT_DATE)::DATE;
  INSERT INTO public.program_assignments (program_id, pt_user_id, atleta_user_id, start_date, end_date, weeks_generated, status, active_days, current_index)
    VALUES (_prog, _pt, _atleta, _start, _start + INTERVAL '28 days', 4, 'active', _active_days, 0)
    RETURNING id INTO _assign;

  _idx := 0;
  FOR _wk IN 0..3 LOOP
    FOREACH _dow IN ARRAY _active_days LOOP
      _tpl_id    := (ARRAY[_tpl_a,_tpl_b,_tpl_c])[(_idx % 3) + 1];
      _tpl_kind  := _tpl_kinds[(_idx % 3) + 1];
      _tpl_title := _tpl_titles[(_idx % 3) + 1];

      INSERT INTO public.workouts (atleta_user_id, pt_user_id, template_id, title, description, scheduled_date, status, template_kind, notes_pt)
        VALUES (_atleta, _pt, _tpl_id, _tpl_title,
                'Settimana ' || (_wk+1) || ' — sessione ' || (_idx+1),
                _start + (_wk*7 + (_dow-1)),
                'attivo', _tpl_kind, '[seed:kato-4week]')
        RETURNING id INTO _workout_id;

      INSERT INTO public.workout_exercises (workout_id, exercise_id, order_index, prescribed_sets, prescribed_reps_min, prescribed_reps_max, rest_seconds)
        SELECT _workout_id, te.exercise_id, te.order_index, te.sets, te.reps_min, te.reps_max, te.rest_seconds
        FROM public.template_exercises te WHERE te.template_id = _tpl_id;

      _created := _created + 1;
      _idx := _idx + 1;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Seed OK — atleta=%, pt=%, program=%, workouts=%', _atleta, _pt, _prog, _created;
END
$seed$;
