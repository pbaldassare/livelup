-- =====================================================
-- Multi-PT: un atleta può avere più PT attivi in parallelo
-- - Illimitati PT attivi
-- - is_primary scelto dall'atleta (al più uno tra gli active)
-- - Disdetta: storico workout/corsi resta (sola lettura lato app)
-- - Progress/foto: già via are_connected → visibili a tutti i PT collegati
-- =====================================================

-- 1) Colonna primary coach
ALTER TABLE public.pt_atleta_connections
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.pt_atleta_connections.is_primary IS
  'Coach primario scelto dall''atleta. Al più uno true tra le connessioni active.';

-- 2) Rimuovi vincolo "un solo PT attivo"
DROP TRIGGER IF EXISTS trigger_enforce_single_pt ON public.pt_atleta_connections;
DROP FUNCTION IF EXISTS public.enforce_single_pt_connection();

-- 3) Al più un primary per atleta (solo tra active)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pt_atleta_one_primary_per_athlete
  ON public.pt_atleta_connections (atleta_user_id)
  WHERE (status = 'active' AND is_primary = true);

CREATE INDEX IF NOT EXISTS idx_pt_atleta_connections_athlete_active
  ON public.pt_atleta_connections (atleta_user_id, status)
  WHERE status = 'active';

-- 4) Backfill: se ha active senza primary, promuovi la più vecchia accepted
UPDATE public.pt_atleta_connections c
SET is_primary = true
WHERE c.status = 'active'
  AND c.is_primary = false
  AND c.id = (
    SELECT c2.id
    FROM public.pt_atleta_connections c2
    WHERE c2.atleta_user_id = c.atleta_user_id
      AND c2.status = 'active'
    ORDER BY c2.accepted_at NULLS LAST, c2.created_at ASC
    LIMIT 1
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.pt_atleta_connections c3
    WHERE c3.atleta_user_id = c.atleta_user_id
      AND c3.status = 'active'
      AND c3.is_primary = true
  );

-- 5) can_atleta_connect_to_pt (legacy 1-arg): sempre true (multi-PT)
CREATE OR REPLACE FUNCTION public.can_atleta_connect_to_pt(_atleta_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT true;
$$;

COMMENT ON FUNCTION public.can_atleta_connect_to_pt(uuid) IS
  'Legacy: multi-PT abilitato. Usare can_atleta_connect_to_specific_pt per il check per-PT.';

-- 6) Check per-PT: niente active/pending già esistenti con quel PT
CREATE OR REPLACE FUNCTION public.can_atleta_connect_to_specific_pt(
  _atleta_user_id uuid,
  _pt_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.pt_atleta_connections
    WHERE atleta_user_id = _atleta_user_id
      AND pt_user_id = _pt_user_id
      AND status IN ('active', 'pending')
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_atleta_connect_to_specific_pt(uuid, uuid) TO authenticated;

-- 7) get_atleta_current_pt → primary, altrimenti qualsiasi active
CREATE OR REPLACE FUNCTION public.get_atleta_current_pt(_atleta_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pt_user_id
  FROM public.pt_atleta_connections
  WHERE atleta_user_id = _atleta_user_id
    AND status = 'active'
  ORDER BY is_primary DESC, accepted_at NULLS LAST, created_at ASC
  LIMIT 1;
$$;

-- 8) Lista PT attivi
CREATE OR REPLACE FUNCTION public.get_atleta_active_pts(_atleta_user_id uuid)
RETURNS TABLE (
  connection_id uuid,
  pt_user_id uuid,
  is_primary boolean,
  is_pt_active boolean,
  accepted_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id AS connection_id,
    c.pt_user_id,
    c.is_primary,
    COALESCE(c.is_pt_active, true) AS is_pt_active,
    c.accepted_at
  FROM public.pt_atleta_connections c
  WHERE c.atleta_user_id = _atleta_user_id
    AND c.status = 'active'
  ORDER BY c.is_primary DESC, c.accepted_at NULLS LAST, c.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_atleta_active_pts(uuid) TO authenticated;

-- 9a) All'attivazione: se nessun primary, questa diventa primary
CREATE OR REPLACE FUNCTION public.ensure_primary_on_activate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' AND COALESCE(NEW.is_primary, false) = false THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.pt_atleta_connections
      WHERE atleta_user_id = NEW.atleta_user_id
        AND status = 'active'
        AND is_primary = true
        AND id IS DISTINCT FROM NEW.id
    ) THEN
      NEW.is_primary := true;
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM 'active' THEN
    NEW.is_primary := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_ensure_primary_on_activate ON public.pt_atleta_connections;
CREATE TRIGGER trigger_ensure_primary_on_activate
  BEFORE INSERT OR UPDATE OF status
  ON public.pt_atleta_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_primary_on_activate();

-- 9b) Dopo disdetta del primary: promuovi un altro active
CREATE OR REPLACE FUNCTION public.promote_primary_after_terminate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'active'
     AND NEW.status = 'terminated'
     AND COALESCE(OLD.is_primary, false) = true
  THEN
    UPDATE public.pt_atleta_connections
    SET is_primary = true, updated_at = now()
    WHERE id = (
      SELECT c.id
      FROM public.pt_atleta_connections c
      WHERE c.atleta_user_id = NEW.atleta_user_id
        AND c.status = 'active'
      ORDER BY c.accepted_at NULLS LAST, c.created_at ASC
      LIMIT 1
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_promote_primary_after_terminate ON public.pt_atleta_connections;
CREATE TRIGGER trigger_promote_primary_after_terminate
  AFTER UPDATE OF status
  ON public.pt_atleta_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.promote_primary_after_terminate();

-- 10) Atleta imposta primary coach
CREATE OR REPLACE FUNCTION public.set_atleta_primary_pt(_pt_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _atleta uuid := auth.uid();
  _conn_id uuid;
BEGIN
  IF _atleta IS NULL OR NOT public.is_atleta(_atleta) THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;

  SELECT id INTO _conn_id
  FROM public.pt_atleta_connections
  WHERE atleta_user_id = _atleta
    AND pt_user_id = _pt_user_id
    AND status = 'active';

  IF _conn_id IS NULL THEN
    RAISE EXCEPTION 'Connessione attiva non trovata con questo Professionista';
  END IF;

  UPDATE public.pt_atleta_connections
  SET is_primary = false, updated_at = now()
  WHERE atleta_user_id = _atleta
    AND status = 'active'
    AND is_primary = true
    AND id IS DISTINCT FROM _conn_id;

  UPDATE public.pt_atleta_connections
  SET is_primary = true, updated_at = now()
  WHERE id = _conn_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_atleta_primary_pt(uuid) TO authenticated;

COMMENT ON FUNCTION public.set_atleta_primary_pt(uuid) IS
  'L''atleta sceglie il coach primario tra le connessioni active.';
