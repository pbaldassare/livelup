-- PT-managed active/inactive flag on athlete connections.
-- Distinct from connection lifecycle (pending/active/terminated) and engagement metrics.

ALTER TABLE public.pt_atleta_connections
  ADD COLUMN IF NOT EXISTS is_pt_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.pt_atleta_connections.is_pt_active IS
  'When false, PT has paused coaching: athlete keeps chat, but schede/workouts/history with that PT are hidden.';

CREATE INDEX IF NOT EXISTS idx_pt_atleta_connections_pt_active
  ON public.pt_atleta_connections (pt_user_id, is_pt_active)
  WHERE status = 'active';
