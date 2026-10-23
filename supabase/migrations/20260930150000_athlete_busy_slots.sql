-- Fasce orarie occupate di un atleta collegato (appuntamenti con altri PT,
-- eventi a cui è iscritto). Solo inizio/fine: niente titoli di altri PT.
CREATE OR REPLACE FUNCTION public.get_athlete_busy_slots(
  _atleta_user_id uuid,
  _from timestamptz,
  _to timestamptz
)
RETURNS TABLE (start_datetime timestamptz, end_datetime timestamptz, is_all_day boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT e.start_datetime, e.end_datetime, e.is_all_day
  FROM public.calendar_events e
  WHERE public.are_connected(auth.uid(), _atleta_user_id)
    AND e.is_cancelled = false
    AND e.start_datetime < _to
    AND COALESCE(e.end_datetime, e.start_datetime + interval '1 hour') > _from
    AND e.pt_user_id IS DISTINCT FROM auth.uid()
    AND (
      e.atleta_user_id = _atleta_user_id
      OR EXISTS (
        SELECT 1 FROM public.event_participants p
        WHERE p.event_id = e.id
          AND p.user_id = _atleta_user_id
          AND p.status = 'registered'
      )
    )
$$;

REVOKE ALL ON FUNCTION public.get_athlete_busy_slots(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_athlete_busy_slots(uuid, timestamptz, timestamptz) TO authenticated;
