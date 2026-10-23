-- Feedback PT: suggerimenti e modifiche (riuso support_tickets + ticket_messages)
-- needs_admin_reply + notifiche al PT + counter admin + bucket allegati

-- -----------------------------------------------------
-- Colonne su support_tickets
-- -----------------------------------------------------

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS needs_admin_reply BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_public_sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_public_message_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_support_tickets_pt_pending
  ON public.support_tickets (needs_admin_reply, status)
  WHERE category LIKE 'pt_%';

-- -----------------------------------------------------
-- Helper
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_pt_feedback_category(_category TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT _category IS NOT NULL AND _category LIKE 'pt_%';
$$;

GRANT EXECUTE ON FUNCTION public.is_pt_feedback_category(TEXT) TO authenticated;

-- -----------------------------------------------------
-- Trigger: nuovo ticket PT → in attesa di risposta admin
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.support_ticket_pt_feedback_init()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_pt_feedback_category(NEW.category) THEN
    IF NOT public.is_pt(NEW.user_id) THEN
      RAISE EXCEPTION 'Solo i Professionisti possono aprire ticket di feedback (categoria pt_*)';
    END IF;
    NEW.needs_admin_reply := true;
    NEW.last_public_sender_id := NEW.user_id;
    NEW.last_public_message_at := COALESCE(NEW.created_at, now());
    IF NEW.metadata IS NULL THEN
      NEW.metadata := jsonb_build_object('source', 'pt');
    ELSE
      NEW.metadata := NEW.metadata || jsonb_build_object('source', 'pt');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_ticket_pt_feedback_init ON public.support_tickets;
CREATE TRIGGER trg_support_ticket_pt_feedback_init
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.support_ticket_pt_feedback_init();

-- Policy insert: categorie pt_% solo per PT
DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;
CREATE POLICY "Users can create tickets"
  ON public.support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      NOT public.is_pt_feedback_category(category)
      OR public.is_pt(auth.uid())
    )
  );

-- -----------------------------------------------------
-- Trigger: messaggi pubblici → aggiorna stato risposta
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_support_ticket_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.support_tickets%ROWTYPE;
BEGIN
  IF NEW.is_internal THEN
    RETURN NEW;
  END IF;

  SELECT * INTO t FROM public.support_tickets WHERE id = NEW.ticket_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  UPDATE public.support_tickets
  SET
    last_public_sender_id = NEW.sender_id,
    last_public_message_at = NEW.created_at,
    needs_admin_reply = (NEW.sender_id = t.user_id),
    updated_at = now()
  WHERE id = NEW.ticket_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_support_ticket_on_message ON public.ticket_messages;
CREATE TRIGGER trg_sync_support_ticket_on_message
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_support_ticket_on_message();

-- -----------------------------------------------------
-- Notifica al PT quando l'admin risponde
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_ticket_reply_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.support_tickets%ROWTYPE;
BEGIN
  IF NEW.is_internal THEN
    RETURN NEW;
  END IF;

  SELECT * INTO t FROM public.support_tickets WHERE id = NEW.ticket_id;
  IF NOT FOUND OR NOT public.is_pt_feedback_category(t.category) THEN
    RETURN NEW;
  END IF;

  IF public.is_admin(NEW.sender_id) AND NEW.sender_id <> t.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, body, data, action_url)
    VALUES (
      t.user_id,
      'support',
      'Risposta al tuo feedback',
      LEFT(NEW.message, 120),
      jsonb_build_object('ticket_id', t.id),
      '/pt/app/feedback/' || t.id::text
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ticket_reply_notification ON public.ticket_messages;
CREATE TRIGGER trg_ticket_reply_notification
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_ticket_reply_notification();

-- Backfill flag su ticket PT esistenti (solo open/in_progress)
UPDATE public.support_tickets t
SET needs_admin_reply = true,
    last_public_sender_id = t.user_id,
    last_public_message_at = COALESCE(t.last_public_message_at, t.updated_at, t.created_at)
WHERE public.is_pt_feedback_category(t.category)
  AND t.status IN ('open', 'in_progress')
  AND NOT EXISTS (
    SELECT 1 FROM public.ticket_messages m
    WHERE m.ticket_id = t.id AND NOT m.is_internal AND m.sender_id <> t.user_id
  );

-- -----------------------------------------------------
-- get_admin_stats: counter feedback PT da rispondere
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS TABLE(
  total_pts integer,
  active_pts integer,
  pending_pts integer,
  suspended_pts integer,
  total_athletes integer,
  connected_athletes integer,
  premium_athletes integer,
  active_subscriptions integer,
  open_tickets integer,
  pt_feedback_pending_replies integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  RETURN QUERY SELECT
    (SELECT COUNT(*)::INTEGER FROM user_roles WHERE role = 'pt'),
    (SELECT COUNT(*)::INTEGER FROM pt_profiles WHERE status = 'attivo'),
    (SELECT COUNT(*)::INTEGER FROM pt_profiles WHERE status = 'in_attesa_approvazione'),
    (SELECT COUNT(*)::INTEGER FROM pt_profiles WHERE status = 'sospeso'),
    (SELECT COUNT(*)::INTEGER FROM user_roles WHERE role = 'atleta'),
    (SELECT COUNT(*)::INTEGER FROM atleta_profiles WHERE status = 'collegato'),
    (SELECT COUNT(*)::INTEGER FROM atleta_profiles WHERE status = 'premium'),
    (SELECT COUNT(*)::INTEGER FROM subscriptions WHERE status = 'attivo'),
    (SELECT COUNT(*)::INTEGER FROM support_tickets WHERE status IN ('open', 'in_progress')),
    (SELECT COUNT(*)::INTEGER FROM support_tickets
      WHERE public.is_pt_feedback_category(category)
        AND status IN ('open', 'in_progress')
        AND needs_admin_reply = true);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;

-- -----------------------------------------------------
-- STORAGE: feedback-attachments (immagini + PDF)
-- Path: ${user_id}/${ticket_id}/${filename}
-- -----------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'feedback-attachments',
  'feedback-attachments',
  false,
  10485760,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users upload own feedback attachments" ON storage.objects;
CREATE POLICY "Users upload own feedback attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'feedback-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users view own feedback attachments" ON storage.objects;
CREATE POLICY "Users view own feedback attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'feedback-attachments'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users delete own feedback attachments" ON storage.objects;
CREATE POLICY "Users delete own feedback attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'feedback-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
