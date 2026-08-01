-- PT must be able to accept/reject pending connections (UPDATE status)
DROP POLICY IF EXISTS "PT can update their connections" ON public.pt_atleta_connections;
CREATE POLICY "PT can update their connections"
  ON public.pt_atleta_connections FOR UPDATE
  TO authenticated
  USING ((auth.uid() = pt_user_id) AND public.is_pt(auth.uid()))
  WITH CHECK ((auth.uid() = pt_user_id) AND public.is_pt(auth.uid()));
