CREATE POLICY "Atleti possono cancellare propri appuntamenti"
ON public.calendar_events
FOR UPDATE
USING (auth.uid() = atleta_user_id AND category = 'appuntamento')
WITH CHECK (auth.uid() = atleta_user_id AND category = 'appuntamento');