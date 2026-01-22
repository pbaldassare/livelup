-- =====================================================
-- BLOCCO 2 PARTE 3: BUSINESS LOGIC FUNCTIONS
-- Logiche fondamentali per gestione stati e relazioni
-- =====================================================

-- =====================================================
-- FUNZIONE: Verifica se atleta può collegarsi a PT
-- Logica: un atleta può avere UN SOLO PT attivo
-- =====================================================

CREATE OR REPLACE FUNCTION public.can_atleta_connect_to_pt(_atleta_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.pt_atleta_connections
    WHERE atleta_user_id = _atleta_user_id
      AND status = 'active'
  )
$$;

-- =====================================================
-- FUNZIONE: Conta atleti attivi di un PT
-- =====================================================

CREATE OR REPLACE FUNCTION public.count_pt_active_athletes(_pt_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.pt_atleta_connections
  WHERE pt_user_id = _pt_user_id
    AND status = 'active'
$$;

-- =====================================================
-- FUNZIONE: Verifica se PT può accettare nuovi atleti
-- (basato su max_athletes in pt_profiles)
-- =====================================================

CREATE OR REPLACE FUNCTION public.can_pt_accept_athletes(_pt_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT COALESCE(max_athletes, 50) 
    FROM public.pt_profiles 
    WHERE user_id = _pt_user_id
  ) > (
    SELECT COUNT(*)::INTEGER
    FROM public.pt_atleta_connections
    WHERE pt_user_id = _pt_user_id
      AND status = 'active'
  )
$$;

-- =====================================================
-- FUNZIONE: Ottieni PT attuale di un atleta
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_atleta_current_pt(_atleta_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pt_user_id
  FROM public.pt_atleta_connections
  WHERE atleta_user_id = _atleta_user_id
    AND status = 'active'
  LIMIT 1
$$;

-- =====================================================
-- FUNZIONE: Verifica subscription attiva
-- =====================================================

CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = _user_id
      AND status IN ('attivo', 'trial')
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- =====================================================
-- FUNZIONE: Ottieni stato subscription utente
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_subscription_status(_user_id UUID)
RETURNS subscription_status
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status
  FROM public.subscriptions
  WHERE user_id = _user_id
  ORDER BY created_at DESC
  LIMIT 1
$$;

-- =====================================================
-- FUNZIONE: Verifica se utente è premium
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_premium(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = _user_id
      AND subscription_type IN ('atleta_premium', 'pt_premium')
      AND status = 'attivo'
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- =====================================================
-- FUNZIONE: Aggiorna stato atleta basato su connessioni
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_atleta_status_on_connection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Aggiorna stato atleta_profiles basato sulla connessione
  IF NEW.status = 'active' THEN
    UPDATE public.atleta_profiles
    SET status = 'collegato', updated_at = now()
    WHERE user_id = NEW.atleta_user_id;
  ELSIF NEW.status = 'terminated' OR OLD.status = 'active' THEN
    -- Se non ha altre connessioni attive, torna a non_collegato
    IF NOT EXISTS (
      SELECT 1 FROM public.pt_atleta_connections
      WHERE atleta_user_id = NEW.atleta_user_id
        AND status = 'active'
        AND id != NEW.id
    ) THEN
      UPDATE public.atleta_profiles
      SET status = 'non_collegato', updated_at = now()
      WHERE user_id = NEW.atleta_user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger per aggiornamento automatico stato atleta
DROP TRIGGER IF EXISTS trigger_update_atleta_status ON public.pt_atleta_connections;
CREATE TRIGGER trigger_update_atleta_status
  AFTER INSERT OR UPDATE OF status ON public.pt_atleta_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_atleta_status_on_connection();

-- =====================================================
-- FUNZIONE: Aggiorna rating medio PT dopo review
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_pt_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_avg DECIMAL(2,1);
  new_count INTEGER;
BEGIN
  -- Calcola nuovo rating medio e conteggio
  SELECT 
    ROUND(AVG(rating)::DECIMAL, 1),
    COUNT(*)::INTEGER
  INTO new_avg, new_count
  FROM public.pt_reviews
  WHERE pt_user_id = COALESCE(NEW.pt_user_id, OLD.pt_user_id)
    AND is_visible = true;
  
  -- Aggiorna pt_profiles
  UPDATE public.pt_profiles
  SET 
    rating_avg = COALESCE(new_avg, 0),
    review_count = COALESCE(new_count, 0),
    updated_at = now()
  WHERE user_id = COALESCE(NEW.pt_user_id, OLD.pt_user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger per aggiornamento automatico rating PT
DROP TRIGGER IF EXISTS trigger_update_pt_rating ON public.pt_reviews;
CREATE TRIGGER trigger_update_pt_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.pt_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pt_rating();

-- =====================================================
-- FUNZIONE: Termina connessione precedente quando se ne crea una nuova
-- (un atleta può avere UN SOLO PT alla volta)
-- =====================================================

CREATE OR REPLACE FUNCTION public.enforce_single_pt_connection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se si sta attivando una nuova connessione
  IF NEW.status = 'active' THEN
    -- Termina tutte le altre connessioni attive per questo atleta
    UPDATE public.pt_atleta_connections
    SET 
      status = 'terminated',
      terminated_at = now(),
      updated_at = now()
    WHERE atleta_user_id = NEW.atleta_user_id
      AND status = 'active'
      AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger per garantire un solo PT attivo
DROP TRIGGER IF EXISTS trigger_enforce_single_pt ON public.pt_atleta_connections;
CREATE TRIGGER trigger_enforce_single_pt
  BEFORE INSERT OR UPDATE OF status ON public.pt_atleta_connections
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION public.enforce_single_pt_connection();

-- =====================================================
-- FUNZIONE: Aggiorna last_message_at in chats
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_chat_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chats
  SET 
    last_message_at = NEW.created_at,
    updated_at = now()
  WHERE id = NEW.chat_id;
  
  RETURN NEW;
END;
$$;

-- Trigger per aggiornamento automatico last_message
DROP TRIGGER IF EXISTS trigger_update_chat_last_message ON public.messages;
CREATE TRIGGER trigger_update_chat_last_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_last_message();

-- =====================================================
-- FUNZIONE: Crea notifica automatica per nuovi messaggi
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id UUID;
  chat_record RECORD;
BEGIN
  -- Ottieni info chat
  SELECT * INTO chat_record FROM public.chats WHERE id = NEW.chat_id;
  
  -- Determina destinatario (l'altro partecipante)
  IF NEW.sender_user_id = chat_record.pt_user_id THEN
    recipient_id := chat_record.atleta_user_id;
  ELSE
    recipient_id := chat_record.pt_user_id;
  END IF;
  
  -- Crea notifica
  INSERT INTO public.notifications (user_id, type, title, body, data, action_url)
  VALUES (
    recipient_id,
    'message',
    'Nuovo messaggio',
    LEFT(NEW.content, 100),
    jsonb_build_object('chat_id', NEW.chat_id, 'message_id', NEW.id),
    '/messages/' || NEW.chat_id::TEXT
  );
  
  RETURN NEW;
END;
$$;

-- Trigger per notifiche automatiche messaggi
DROP TRIGGER IF EXISTS trigger_message_notification ON public.messages;
CREATE TRIGGER trigger_message_notification
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_message_notification();

-- =====================================================
-- FUNZIONE: Crea notifica per nuova richiesta connessione
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_connection_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id UUID;
  notification_title TEXT;
  notification_body TEXT;
BEGIN
  -- Notifica solo per nuove richieste o accettazioni
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    -- Nuova richiesta: notifica al PT o atleta (chi non ha richiesto)
    IF NEW.requested_by = NEW.atleta_user_id THEN
      recipient_id := NEW.pt_user_id;
      notification_title := 'Nuova richiesta di collegamento';
      notification_body := 'Un atleta vuole allenarsi con te';
    ELSE
      recipient_id := NEW.atleta_user_id;
      notification_title := 'Invito ricevuto';
      notification_body := 'Un Personal Trainer ti ha invitato';
    END IF;
    
    INSERT INTO public.notifications (user_id, type, title, body, data, action_url)
    VALUES (recipient_id, 'connection', notification_title, notification_body, 
            jsonb_build_object('connection_id', NEW.id), '/connections');
            
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'active' AND OLD.status = 'pending' THEN
    -- Connessione accettata: notifica a chi aveva richiesto
    recipient_id := NEW.requested_by;
    
    INSERT INTO public.notifications (user_id, type, title, body, data, action_url)
    VALUES (recipient_id, 'connection', 'Richiesta accettata!', 
            'La tua richiesta di collegamento è stata accettata',
            jsonb_build_object('connection_id', NEW.id), '/connections');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger per notifiche connessioni
DROP TRIGGER IF EXISTS trigger_connection_notification ON public.pt_atleta_connections;
CREATE TRIGGER trigger_connection_notification
  AFTER INSERT OR UPDATE OF status ON public.pt_atleta_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.create_connection_notification();

-- =====================================================
-- FUNZIONE: Verifica blocco per subscription scaduta
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_subscription_block(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = _user_id
      AND status = 'bloccato'
  )
$$;

-- =====================================================
-- FUNZIONE: Conteggio workout completati atleta
-- =====================================================

CREATE OR REPLACE FUNCTION public.count_completed_workouts(_atleta_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.workouts
  WHERE atleta_user_id = _atleta_user_id
    AND status = 'completato'
$$;

-- =====================================================
-- FUNZIONE: Conteggio messaggi non letti
-- =====================================================

CREATE OR REPLACE FUNCTION public.count_unread_messages(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.messages m
  JOIN public.chats c ON c.id = m.chat_id
  WHERE (c.pt_user_id = _user_id OR c.atleta_user_id = _user_id)
    AND m.sender_user_id != _user_id
    AND m.is_read = false
$$;

-- =====================================================
-- FUNZIONE: Conteggio notifiche non lette
-- =====================================================

CREATE OR REPLACE FUNCTION public.count_unread_notifications(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.notifications
  WHERE user_id = _user_id
    AND is_read = false
$$;