-- Realtime
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='workouts';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.workouts; END IF;
END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='workout_logs';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_logs; END IF;
END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='pt_athlete_notes';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.pt_athlete_notes; END IF;
END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='athlete_documents';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.athlete_documents; END IF;
END $$;

ALTER TABLE public.workouts REPLICA IDENTITY FULL;
ALTER TABLE public.workout_logs REPLICA IDENTITY FULL;
ALTER TABLE public.pt_athlete_notes REPLICA IDENTITY FULL;
ALTER TABLE public.athlete_documents REPLICA IDENTITY FULL;

-- Strengthen PT notes policy: PT must be actively connected to the athlete
DROP POLICY IF EXISTS "PT can manage own notes" ON public.pt_athlete_notes;
CREATE POLICY "PT can manage own notes"
ON public.pt_athlete_notes
FOR ALL
TO authenticated
USING (pt_user_id = auth.uid())
WITH CHECK (
  pt_user_id = auth.uid()
  AND public.are_connected(auth.uid(), atleta_user_id)
);