-- PT can remove badges from connected athletes
CREATE POLICY "PT can remove badges from connected athletes"
  ON public.atleta_badges FOR DELETE
  TO authenticated
  USING (
    public.is_pt(auth.uid())
    AND public.are_connected(auth.uid(), atleta_user_id)
  );
