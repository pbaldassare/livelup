-- PT can log progress for connected athletes (Nuova rilevazione)
DROP POLICY IF EXISTS "PT can insert connected atleta progress" ON public.progress_tracking;
CREATE POLICY "PT can insert connected atleta progress"
  ON public.progress_tracking FOR INSERT TO authenticated
  WITH CHECK (
    public.is_pt(auth.uid())
    AND public.are_connected(auth.uid(), atleta_user_id)
  );

DROP POLICY IF EXISTS "PT can update connected atleta progress" ON public.progress_tracking;
CREATE POLICY "PT can update connected atleta progress"
  ON public.progress_tracking FOR UPDATE TO authenticated
  USING (
    public.is_pt(auth.uid())
    AND public.are_connected(auth.uid(), atleta_user_id)
  )
  WITH CHECK (
    public.is_pt(auth.uid())
    AND public.are_connected(auth.uid(), atleta_user_id)
  );

-- Idempotent demo seed for PT Marco Ferrari (76c207f5-ba7d-48d7-a7f2-c95f4819aebd)
DO $$
DECLARE
  v_pt_id UUID := '76c207f5-ba7d-48d7-a7f2-c95f4819aebd';
  v_athlete RECORD;
  v_pkg_id UUID;
  v_i INT;
  v_date DATE;
  v_weight NUMERIC;
  v_seed_tag TEXT := '[seed:marco-demo]';
  v_athlete_count INT := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_pt_id) THEN
    RAISE NOTICE 'PT Marco Ferrari not found — skipping demo seed';
    RETURN;
  END IF;

  -- Ensure at least one PT package exists
  SELECT id INTO v_pkg_id
  FROM public.pt_packages
  WHERE pt_user_id = v_pt_id AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_pkg_id IS NULL THEN
    INSERT INTO public.pt_packages (
      pt_user_id, name, description, package_type, price, currency,
      sessions_count, duration_days, is_active, includes_chat
    ) VALUES (
      v_pt_id,
      'Pacchetto 10 sessioni',
      'Allenamento personalizzato con follow-up settimanale',
      'sessioni',
      150.00,
      'EUR',
      10,
      90,
      true,
      true
    )
    RETURNING id INTO v_pkg_id;
  END IF;

  -- Progress + subscriptions for connected athletes (prefer Giulia Rossi / Kato AIFP)
  FOR v_athlete IN
    SELECT p.user_id, p.first_name, p.last_name
    FROM public.profiles p
    INNER JOIN public.pt_atleta_connections c
      ON c.atleta_user_id = p.user_id
      AND c.pt_user_id = v_pt_id
      AND c.status = 'active'
    WHERE (
      (p.first_name ILIKE 'Giulia' AND p.last_name ILIKE 'Rossi%')
      OR p.first_name ILIKE 'Kato%'
      OR p.last_name ILIKE '%AIFP%'
    )
    UNION
    SELECT p.user_id, p.first_name, p.last_name
    FROM public.profiles p
    INNER JOIN public.pt_atleta_connections c
      ON c.atleta_user_id = p.user_id
      AND c.pt_user_id = v_pt_id
      AND c.status = 'active'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.profiles p2
      INNER JOIN public.pt_atleta_connections c2
        ON c2.atleta_user_id = p2.user_id AND c2.pt_user_id = v_pt_id AND c2.status = 'active'
      WHERE (p2.first_name ILIKE 'Giulia' AND p2.last_name ILIKE 'Rossi%')
         OR p2.first_name ILIKE 'Kato%'
         OR p2.last_name ILIKE '%AIFP%'
    )
    LIMIT 5
  LOOP
    v_athlete_count := v_athlete_count + 1;

    IF NOT EXISTS (
      SELECT 1 FROM public.progress_tracking
      WHERE atleta_user_id = v_athlete.user_id
        AND notes LIKE v_seed_tag || '%'
    ) THEN
      IF v_athlete.first_name ILIKE 'Kato%' OR v_athlete.last_name ILIKE '%AIFP%' THEN
        v_weight := 83.5;
        FOR v_i IN 0..9 LOOP
          v_date := (CURRENT_DATE - ((9 - v_i) * 7))::date;
          v_weight := v_weight + (random() * 0.4 - 0.2);
          INSERT INTO public.progress_tracking (
            atleta_user_id, tracked_date, weight_kg, body_fat_percentage,
            energy_level, mood_level, sleep_hours, sleep_quality,
            waist_cm, chest_cm, notes
          ) VALUES (
            v_athlete.user_id,
            v_date,
            round(v_weight::numeric, 1),
            round((16.5 + random() * 1.2)::numeric, 1),
            5 + (v_i / 3),
            5 + (v_i / 4),
            round((7.0 + random() * 1.0)::numeric, 1),
            4 + (v_i / 5),
            round((86.0 - v_i * 0.15)::numeric, 1),
            round((102.0 + v_i * 0.1)::numeric, 1),
            CASE WHEN v_i = 9 THEN v_seed_tag || ' Buon progresso sulle trazioni.' ELSE v_seed_tag END
          );
        END LOOP;
      ELSE
        v_weight := 68.8;
        FOR v_i IN 0..11 LOOP
          v_date := (CURRENT_DATE - ((11 - v_i) * 7))::date;
          v_weight := v_weight - (random() * 0.25);
          INSERT INTO public.progress_tracking (
            atleta_user_id, tracked_date, weight_kg, body_fat_percentage,
            energy_level, mood_level, sleep_hours, sleep_quality,
            waist_cm, hips_cm, notes
          ) VALUES (
            v_athlete.user_id,
            v_date,
            round(v_weight::numeric, 1),
            round((28.0 - v_i * 0.35 + random() * 0.3)::numeric, 1),
            4 + (v_i / 3),
            4 + (v_i / 4),
            round((6.5 + random() * 1.5)::numeric, 1),
            3 + (v_i / 4),
            round((78.0 - v_i * 0.4)::numeric, 1),
            round((98.0 - v_i * 0.2)::numeric, 1),
            CASE WHEN v_i = 11 THEN v_seed_tag || ' Obiettivo -3kg quasi raggiunto!' ELSE v_seed_tag END
          );
        END LOOP;
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.atleta_pt_subscriptions
      WHERE atleta_user_id = v_athlete.user_id
        AND pt_user_id = v_pt_id
        AND notes LIKE v_seed_tag || '%'
    ) THEN
      INSERT INTO public.atleta_pt_subscriptions (
        atleta_user_id, pt_user_id, package_id, status, price_paid, currency,
        sessions_total, sessions_used, started_at, expires_at, auto_renew, notes
      ) VALUES (
        v_athlete.user_id,
        v_pt_id,
        v_pkg_id,
        'attivo',
        CASE WHEN v_athlete_count = 1 THEN 150.00 ELSE 120.00 END,
        'EUR',
        10,
        CASE WHEN v_athlete_count = 1 THEN 4 ELSE 7 END,
        (NOW() - INTERVAL '45 days')::timestamptz,
        CASE
          WHEN v_athlete_count = 1 THEN (NOW() + INTERVAL '10 days')::timestamptz
          ELSE (NOW() + INTERVAL '60 days')::timestamptz
        END,
        true,
        v_seed_tag || ' Abbonamento demo'
      );
    END IF;
  END LOOP;

  -- PT platform payments (Guadagni / fatturazione PT)
  IF NOT EXISTS (
    SELECT 1 FROM public.payments
    WHERE user_id = v_pt_id AND description LIKE v_seed_tag || '%'
  ) THEN
    INSERT INTO public.payments (
      user_id, amount, currency, status, payment_method, description, paid_at, created_at
    ) VALUES
      (v_pt_id, 99.00, 'EUR', 'completed', 'stripe', v_seed_tag || ' Abbonamento Pro — luglio', date_trunc('month', NOW()) + INTERVAL '3 days', NOW() - INTERVAL '11 days'),
      (v_pt_id, 99.00, 'EUR', 'completed', 'stripe', v_seed_tag || ' Abbonamento Pro — giugno', date_trunc('month', NOW()) - INTERVAL '1 month' + INTERVAL '5 days', NOW() - INTERVAL '40 days'),
      (v_pt_id, 149.00, 'EUR', 'completed', 'bank_transfer', v_seed_tag || ' Upgrade piano Premium', date_trunc('month', NOW()) + INTERVAL '8 days', NOW() - INTERVAL '6 days'),
      (v_pt_id, 79.00, 'EUR', 'pending', 'stripe', v_seed_tag || ' Rinnovo add-on Analytics', NULL, NOW() - INTERVAL '2 days'),
      (v_pt_id, 59.00, 'EUR', 'pending', 'paypal', v_seed_tag || ' Corso CEU online', NULL, NOW() - INTERVAL '1 day');
  END IF;

  RAISE NOTICE 'Marco Ferrari demo seed completed for % athletes', v_athlete_count;
END $$;
