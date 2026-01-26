-- =====================================================
-- TRIGGER: Decremento automatico sessioni abbonamento
-- =====================================================

-- Funzione che decrementa le sessioni quando un workout viene completato
CREATE OR REPLACE FUNCTION public.decrement_subscription_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  subscription_record RECORD;
BEGIN
  -- Solo se il workout è stato completato (status cambia a 'completato')
  IF NEW.status = 'completato' AND (OLD.status IS NULL OR OLD.status != 'completato') THEN
    -- Trova abbonamento attivo a sessioni per questa coppia atleta-PT
    SELECT * INTO subscription_record
    FROM public.atleta_pt_subscriptions
    WHERE atleta_user_id = NEW.atleta_user_id
      AND pt_user_id = NEW.pt_user_id
      AND status = 'attivo'
      AND sessions_total IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF FOUND THEN
      -- Incrementa sessioni usate e aggiorna status se necessario
      UPDATE public.atleta_pt_subscriptions
      SET 
        sessions_used = COALESCE(sessions_used, 0) + 1,
        status = CASE 
          WHEN COALESCE(sessions_used, 0) + 1 >= sessions_total THEN 'completato'::pt_subscription_status
          ELSE status
        END,
        updated_at = now()
      WHERE id = subscription_record.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger che si attiva quando un workout viene aggiornato
DROP TRIGGER IF EXISTS on_workout_completed ON public.workouts;
CREATE TRIGGER on_workout_completed
  AFTER UPDATE ON public.workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_subscription_session();

-- Creiamo anche una policy per permettere ai PT di visualizzare i profili degli atleti connessi tramite abbonamenti
CREATE POLICY "PT can view subscriber profiles"
  ON public.profiles FOR SELECT
  USING (
    is_pt(auth.uid()) AND 
    EXISTS (
      SELECT 1 FROM public.atleta_pt_subscriptions
      WHERE pt_user_id = auth.uid()
      AND atleta_user_id = profiles.user_id
    )
  );