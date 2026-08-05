-- =====================================================
-- Athlete redo completed workout
-- Creates a fresh assignment (attivo) by copying structure
-- from a completed workout. Does not modify the original.
-- =====================================================

CREATE OR REPLACE FUNCTION public.athlete_redo_workout(_workout_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _src public.workouts%ROWTYPE;
  _new_id uuid;
  _uid uuid := auth.uid();
  _blk record;
  _new_block_id uuid;
  _block_map jsonb := '{}'::jsonb;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;

  IF NOT public.is_atleta(_uid) THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;

  SELECT *
  INTO _src
  FROM public.workouts
  WHERE id = _workout_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Allenamento non trovato';
  END IF;

  IF _src.atleta_user_id <> _uid THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;

  IF _src.status <> 'completato' THEN
    RAISE EXCEPTION 'Puoi rifare solo un allenamento già completato';
  END IF;

  -- Collaborazione attiva (e coaching non in pausa) con il PT della scheda
  IF _src.pt_user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.pt_atleta_connections c
      WHERE c.atleta_user_id = _uid
        AND c.pt_user_id = _src.pt_user_id
        AND c.status = 'active'
        AND COALESCE(c.is_pt_active, true) = true
    ) THEN
      RAISE EXCEPTION 'Non puoi rifare questa scheda: collaborazione non attiva con il Professionista';
    END IF;
  END IF;

  INSERT INTO public.workouts (
    atleta_user_id,
    pt_user_id,
    title,
    description,
    template_id,
    template_kind,
    scheduled_date,
    due_date,
    status,
    athlete_reordered_at
  ) VALUES (
    _src.atleta_user_id,
    _src.pt_user_id,
    _src.title,
    _src.description,
    _src.template_id,
    COALESCE(_src.template_kind, 'libera'),
    CURRENT_DATE,
    NULL,
    'attivo',
    NULL
  )
  RETURNING id INTO _new_id;

  FOR _blk IN
    SELECT id, order_index, type, name, params, info_note
    FROM public.workout_blocks
    WHERE workout_id = _src.id
    ORDER BY order_index
  LOOP
    INSERT INTO public.workout_blocks (
      workout_id, order_index, type, name, params, info_note
    ) VALUES (
      _new_id,
      _blk.order_index,
      _blk.type,
      _blk.name,
      COALESCE(_blk.params, '{}'::jsonb),
      _blk.info_note
    )
    RETURNING id INTO _new_block_id;

    _block_map := _block_map || jsonb_build_object(_blk.id::text, _new_block_id::text);
  END LOOP;

  INSERT INTO public.workout_exercises (
    workout_id,
    exercise_id,
    order_index,
    prescribed_sets,
    prescribed_reps_min,
    prescribed_reps_max,
    prescribed_duration_seconds,
    prescribed_weight,
    rest_seconds,
    notes,
    sets_data,
    block_id,
    protocol_type,
    protocol_params,
    phase
  )
  SELECT
    _new_id,
    we.exercise_id,
    we.order_index,
    we.prescribed_sets,
    we.prescribed_reps_min,
    we.prescribed_reps_max,
    we.prescribed_duration_seconds,
    we.prescribed_weight,
    COALESCE(we.rest_seconds, 60),
    we.notes,
    we.sets_data,
    CASE
      WHEN we.block_id IS NULL THEN NULL
      ELSE NULLIF(_block_map ->> we.block_id::text, '')::uuid
    END,
    COALESCE(we.protocol_type, 'SET'),
    COALESCE(we.protocol_params, '{}'::jsonb),
    we.phase
  FROM public.workout_exercises we
  WHERE we.workout_id = _src.id
  ORDER BY we.order_index;

  RETURN _new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.athlete_redo_workout(uuid) TO authenticated;

COMMENT ON FUNCTION public.athlete_redo_workout(uuid) IS
  'Atleta: duplica una scheda completata in una nuova assegnazione attiva (senza toccare lo storico).';
