-- =====================================================
-- Scheda libera: tipologia + riordino esercizi atleta
-- =====================================================

-- Tipologia template (default: libera). Altre tipologie arriveranno dopo.
ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS template_kind text NOT NULL DEFAULT 'libera';

ALTER TABLE public.workout_templates
  DROP CONSTRAINT IF EXISTS workout_templates_template_kind_check;

ALTER TABLE public.workout_templates
  ADD CONSTRAINT workout_templates_template_kind_check
  CHECK (template_kind IN ('libera', 'propedeutica', 'progressiva'));

COMMENT ON COLUMN public.workout_templates.template_kind IS
  'Tipologia scheda: libera | propedeutica | progressiva';

-- Snapshot sul workout assegnato + flag riordino atleta (visibile al PT)
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS template_kind text NOT NULL DEFAULT 'libera';

ALTER TABLE public.workouts
  DROP CONSTRAINT IF EXISTS workouts_template_kind_check;

ALTER TABLE public.workouts
  ADD CONSTRAINT workouts_template_kind_check
  CHECK (template_kind IN ('libera', 'propedeutica', 'progressiva'));

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS athlete_reordered_at timestamptz;

COMMENT ON COLUMN public.workouts.athlete_reordered_at IS
  'Timestamp ultimo riordino esercizi free da parte dell''atleta (scheda libera)';

-- RPC: atleta riordina solo esercizi free (block_id IS NULL), solo prima di partire
CREATE OR REPLACE FUNCTION public.atleta_reorder_workout_exercises(
  _workout_id uuid,
  _ordered_free_exercise_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_workout public.workouts%ROWTYPE;
  v_free_ids uuid[];
  v_slots int[];
  v_i int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;

  SELECT * INTO v_workout
  FROM public.workouts
  WHERE id = _workout_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Allenamento non trovato';
  END IF;

  IF v_workout.atleta_user_id <> v_uid THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;

  IF v_workout.template_kind IS DISTINCT FROM 'libera' THEN
    RAISE EXCEPTION 'Questa tipologia di scheda non consente il riordino';
  END IF;

  -- Solo prima di partire
  IF v_workout.status IS DISTINCT FROM 'attivo' THEN
    RAISE EXCEPTION 'Puoi riordinare solo prima di iniziare l''allenamento';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.workout_exercises we
    JOIN public.workout_logs wl ON wl.workout_exercise_id = we.id
    WHERE we.workout_id = _workout_id
      AND wl.is_completed = true
  ) THEN
    RAISE EXCEPTION 'Puoi riordinare solo prima di iniziare l''allenamento';
  END IF;

  SELECT coalesce(array_agg(we.id ORDER BY we.order_index), '{}'::uuid[])
  INTO v_free_ids
  FROM public.workout_exercises we
  WHERE we.workout_id = _workout_id
    AND we.block_id IS NULL;

  IF coalesce(array_length(v_free_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Nessun esercizio libero da riordinare';
  END IF;

  IF _ordered_free_exercise_ids IS NULL
     OR array_length(_ordered_free_exercise_ids, 1) IS DISTINCT FROM array_length(v_free_ids, 1)
  THEN
    RAISE EXCEPTION 'Lista esercizi non valida';
  END IF;

  -- Deve essere una permutazione esatta degli esercizi free
  IF EXISTS (
    SELECT 1
    FROM unnest(v_free_ids) AS expected(id)
    WHERE expected.id <> ALL (_ordered_free_exercise_ids)
  ) OR EXISTS (
    SELECT 1
    FROM unnest(_ordered_free_exercise_ids) AS incoming(id)
    WHERE incoming.id <> ALL (v_free_ids)
  ) THEN
    RAISE EXCEPTION 'Puoi riordinare solo gli esercizi liberi (non i circuiti)';
  END IF;

  SELECT coalesce(array_agg(we.order_index ORDER BY we.order_index), '{}'::int[])
  INTO v_slots
  FROM public.workout_exercises we
  WHERE we.workout_id = _workout_id
    AND we.block_id IS NULL;

  FOR v_i IN 1 .. array_length(_ordered_free_exercise_ids, 1) LOOP
    UPDATE public.workout_exercises
    SET order_index = v_slots[v_i]
    WHERE id = _ordered_free_exercise_ids[v_i]
      AND workout_id = _workout_id
      AND block_id IS NULL;
  END LOOP;

  UPDATE public.workouts
  SET
    athlete_reordered_at = now(),
    updated_at = now()
  WHERE id = _workout_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.atleta_reorder_workout_exercises(uuid, uuid[]) TO authenticated;

COMMENT ON FUNCTION public.atleta_reorder_workout_exercises(uuid, uuid[]) IS
  'Atleta: riordina esercizi free di una scheda libera prima dell''inizio. I blocchi (EMOM/AMRAP/SUPERSET/…) restano fissi.';
