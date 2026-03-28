
-- Tabella broadcast admin
CREATE TABLE public.admin_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_user_id uuid NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  target_type text NOT NULL DEFAULT 'all_users',
  target_user_id uuid,
  recipients_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage admin_broadcasts"
  ON public.admin_broadcasts FOR ALL
  USING (is_admin(auth.uid()));

-- Tabella destinatari broadcast
CREATE TABLE public.admin_broadcast_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES public.admin_broadcasts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_broadcast_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage broadcast_recipients"
  ON public.admin_broadcast_recipients FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own broadcast_recipients"
  ON public.admin_broadcast_recipients FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
