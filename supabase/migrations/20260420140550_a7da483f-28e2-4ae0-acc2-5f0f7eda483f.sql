-- Tabella telemetria 404
CREATE TABLE public.app_404_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path TEXT NOT NULL,
  referrer TEXT,
  user_id UUID,
  role TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_app_404_logs_path ON public.app_404_logs(path);
CREATE INDEX idx_app_404_logs_created_at ON public.app_404_logs(created_at DESC);

ALTER TABLE public.app_404_logs ENABLE ROW LEVEL SECURITY;

-- Solo admin può leggere
CREATE POLICY "Admins can read 404 logs"
ON public.app_404_logs
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Chiunque può inserire (anche non autenticati: logging trasparente)
CREATE POLICY "Anyone can insert 404 logs"
ON public.app_404_logs
FOR INSERT
WITH CHECK (true);

-- Pulizia URL notifiche legacy
UPDATE public.notifications
SET action_url = '/app/esercizi'
WHERE action_url = '/app/workouts';