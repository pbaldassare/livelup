
-- 1) RLS: PT può insert/update progressi per atleti connessi
DROP POLICY IF EXISTS "PT can insert connected atleta progress" ON public.progress_tracking;
CREATE POLICY "PT can insert connected atleta progress"
  ON public.progress_tracking FOR INSERT TO authenticated
  WITH CHECK (public.is_pt(auth.uid()) AND public.are_connected(auth.uid(), atleta_user_id));

DROP POLICY IF EXISTS "PT can update connected atleta progress" ON public.progress_tracking;
CREATE POLICY "PT can update connected atleta progress"
  ON public.progress_tracking FOR UPDATE TO authenticated
  USING (public.is_pt(auth.uid()) AND public.are_connected(auth.uid(), atleta_user_id))
  WITH CHECK (public.is_pt(auth.uid()) AND public.are_connected(auth.uid(), atleta_user_id));

-- 2) Seed demo per Marco Ferrari
DO $$
DECLARE
  v_pt uuid := '76c207f5-ba7d-48d7-a7f2-c95f4819aebd';
  v_giulia uuid := 'a6e2cd09-1a65-4bad-9798-0d56155b29eb';
  v_pkg uuid;
  i int;
  w numeric;
  bf numeric;
BEGIN
  -- Pacchetto demo
  SELECT id INTO v_pkg FROM public.pt_packages
    WHERE pt_user_id = v_pt AND name = 'Pacchetto 10 sessioni' LIMIT 1;
  IF v_pkg IS NULL THEN
    INSERT INTO public.pt_packages (pt_user_id, name, description, package_type, price, sessions_count, is_active)
    VALUES (v_pt, 'Pacchetto 10 sessioni', '[seed:marco-demo] Pacchetto demo 10 sessioni', 'sessioni', 150, 10, true)
    RETURNING id INTO v_pkg;
  END IF;

  -- Progressi Giulia Rossi (12 settimane), solo se non già seminati
  IF NOT EXISTS (SELECT 1 FROM public.progress_tracking
                 WHERE atleta_user_id = v_giulia AND notes LIKE '[seed:marco-demo]%') THEN
    FOR i IN 0..11 LOOP
      w := 68.8 - (i * 0.3) + (random() * 0.4 - 0.2);
      bf := 26.0 - (i * 0.25) + (random() * 0.3 - 0.15);
      INSERT INTO public.progress_tracking (
        atleta_user_id, tracked_date, weight_kg, body_fat_percentage,
        waist_cm, hips_cm, chest_cm, bicep_left_cm, bicep_right_cm,
        energy_level, mood_level, sleep_hours, sleep_quality, notes
      ) VALUES (
        v_giulia,
        (CURRENT_DATE - ((11 - i) * 7))::date,
        ROUND(w::numeric, 1),
        ROUND(bf::numeric, 1),
        ROUND((74 - i * 0.4)::numeric, 1),
        ROUND((98 - i * 0.3)::numeric, 1),
        ROUND((90 - i * 0.15)::numeric, 1),
        ROUND((28 + i * 0.05)::numeric, 1),
        ROUND((28.2 + i * 0.05)::numeric, 1),
        6 + (i % 4),
        6 + (i % 4),
        ROUND((7 + (random() * 1.2 - 0.6))::numeric, 1),
        6 + (i % 4),
        '[seed:marco-demo] Rilevazione settimana ' || (i+1)
      )
      ON CONFLICT (atleta_user_id, tracked_date) DO NOTHING;
    END LOOP;
  END IF;

  -- Abbonamenti demo Giulia
  IF NOT EXISTS (SELECT 1 FROM public.atleta_pt_subscriptions
                 WHERE atleta_user_id = v_giulia AND pt_user_id = v_pt
                   AND notes LIKE '[seed:marco-demo]%') THEN
    INSERT INTO public.atleta_pt_subscriptions
      (atleta_user_id, pt_user_id, package_id, status, sessions_total, sessions_used, started_at, expires_at, price_paid, notes)
    VALUES
      (v_giulia, v_pt, v_pkg, 'attivo', 10, 7, now() - interval '80 days', now() + interval '10 days', 150, '[seed:marco-demo] Abbonamento demo in scadenza'),
      (v_giulia, v_pt, v_pkg, 'attivo', 10, 2, now() - interval '10 days', now() + interval '60 days', 150, '[seed:marco-demo] Abbonamento demo');
  END IF;

  -- Pagamenti demo Marco
  IF NOT EXISTS (SELECT 1 FROM public.payments
                 WHERE user_id = v_pt AND description LIKE '[seed:marco-demo]%') THEN
    INSERT INTO public.payments (user_id, amount, currency, status, description, paid_at, created_at)
    VALUES
      (v_pt,  99, 'EUR', 'completed', '[seed:marco-demo] Pagamento sessione singola', now() - interval '5 days',  now() - interval '5 days'),
      (v_pt, 149, 'EUR', 'completed', '[seed:marco-demo] Pacchetto trimestrale',      now() - interval '12 days', now() - interval '12 days'),
      (v_pt,  79, 'EUR', 'pending',   '[seed:marco-demo] Sessione in attesa',         NULL,                       now() - interval '2 days'),
      (v_pt,  59, 'EUR', 'pending',   '[seed:marco-demo] Consulenza in attesa',       NULL,                       now() - interval '1 day');
  END IF;
END $$;
