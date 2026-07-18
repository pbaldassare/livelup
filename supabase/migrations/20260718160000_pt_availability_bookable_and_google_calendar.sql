-- =====================================================
-- PT availability bookable flag + Google Calendar connection
-- =====================================================

-- Flag: when true, connected athletes can see weekly slots and book
ALTER TABLE public.pt_profiles
  ADD COLUMN IF NOT EXISTS availability_bookable boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.pt_profiles.availability_bookable IS
  'If true, connected athletes can see weekly availability and book appointments in those slots.';

-- Connected athletes can read their PT profile (needed for availability_bookable flag)
DROP POLICY IF EXISTS "Atleta can view connected PT profile" ON public.pt_profiles;
CREATE POLICY "Atleta can view connected PT profile"
  ON public.pt_profiles FOR SELECT
  USING (
    public.is_atleta(auth.uid())
    AND public.are_connected(user_id, auth.uid())
  );

-- Tighten athlete SELECT on pt_availability: require bookable flag
DROP POLICY IF EXISTS "Atleta can view connected PT availability" ON public.pt_availability;

CREATE POLICY "Atleta can view connected PT availability"
  ON public.pt_availability FOR SELECT
  USING (
    public.is_atleta(auth.uid())
    AND public.are_connected(pt_user_id, auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.pt_profiles pp
      WHERE pp.user_id = pt_availability.pt_user_id
        AND pp.availability_bookable = true
    )
  );

-- Public / discoverable read of availability only when bookable (for PT public profile)
DROP POLICY IF EXISTS "Public can view bookable PT availability" ON public.pt_availability;

CREATE POLICY "Public can view bookable PT availability"
  ON public.pt_availability FOR SELECT
  USING (
    is_available = true
    AND EXISTS (
      SELECT 1
      FROM public.pt_profiles pp
      WHERE pp.user_id = pt_availability.pt_user_id
        AND pp.availability_bookable = true
        AND pp.is_discoverable = true
        AND pp.status = 'attivo'
    )
  );

-- Google Calendar connection status (tokens optional until full sync)
CREATE TABLE IF NOT EXISTS public.pt_google_calendar_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_email text,
  google_account_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  calendar_id text DEFAULT 'primary',
  status text NOT NULL DEFAULT 'connected'
    CHECK (status IN ('connected', 'disconnected', 'error', 'pending')),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pt_user_id)
);

CREATE INDEX IF NOT EXISTS idx_pt_gcal_connections_pt
  ON public.pt_google_calendar_connections(pt_user_id);

ALTER TABLE public.pt_google_calendar_connections ENABLE ROW LEVEL SECURITY;

-- Tokens stay server-side (service_role). Clients only see status fields.
REVOKE ALL ON public.pt_google_calendar_connections FROM PUBLIC;
REVOKE ALL ON public.pt_google_calendar_connections FROM anon;
REVOKE ALL ON public.pt_google_calendar_connections FROM authenticated;
GRANT ALL ON public.pt_google_calendar_connections TO service_role;
GRANT SELECT (
  id, pt_user_id, google_email, google_account_id, calendar_id,
  status, last_synced_at, last_error, created_at, updated_at
) ON public.pt_google_calendar_connections TO authenticated;
GRANT DELETE ON public.pt_google_calendar_connections TO authenticated;

DROP POLICY IF EXISTS "PT select own google calendar connection"
  ON public.pt_google_calendar_connections;
CREATE POLICY "PT select own google calendar connection"
  ON public.pt_google_calendar_connections FOR SELECT
  USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

DROP POLICY IF EXISTS "PT delete own google calendar connection"
  ON public.pt_google_calendar_connections;
CREATE POLICY "PT delete own google calendar connection"
  ON public.pt_google_calendar_connections FOR DELETE
  USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

DROP POLICY IF EXISTS "Admins view google calendar connections"
  ON public.pt_google_calendar_connections;
CREATE POLICY "Admins view google calendar connections"
  ON public.pt_google_calendar_connections FOR SELECT
  USING (public.is_admin(auth.uid()));

-- updated_at trigger (reuse generic if present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    DROP TRIGGER IF EXISTS update_pt_gcal_connections_updated_at
      ON public.pt_google_calendar_connections;
    CREATE TRIGGER update_pt_gcal_connections_updated_at
      BEFORE UPDATE ON public.pt_google_calendar_connections
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
