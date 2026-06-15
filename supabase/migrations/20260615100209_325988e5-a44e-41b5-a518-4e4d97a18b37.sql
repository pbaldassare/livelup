ALTER TABLE public.pt_athlete_notes
  ADD COLUMN IF NOT EXISTS is_shared_with_athlete boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Atleta can view shared PT notes" ON public.pt_athlete_notes;
CREATE POLICY "Atleta can view shared PT notes"
ON public.pt_athlete_notes
FOR SELECT
TO authenticated
USING (
  is_shared_with_athlete = true
  AND atleta_user_id = auth.uid()
  AND public.is_connected_to_pt(auth.uid(), pt_user_id)
);