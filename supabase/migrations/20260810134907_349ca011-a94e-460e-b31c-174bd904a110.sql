-- =============================================
-- 1) pt_athlete_categories
-- =============================================
CREATE TABLE IF NOT EXISTS public.pt_athlete_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pt_user_id UUID NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pt_athlete_categories_system_owner_chk
    CHECK ((is_system AND pt_user_id IS NULL) OR (NOT is_system AND pt_user_id IS NOT NULL))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pt_athlete_categories TO authenticated;
GRANT ALL ON public.pt_athlete_categories TO service_role;

ALTER TABLE public.pt_athlete_categories ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS pt_athlete_categories_system_slug_key
  ON public.pt_athlete_categories (slug) WHERE is_system;
CREATE UNIQUE INDEX IF NOT EXISTS pt_athlete_categories_pt_slug_key
  ON public.pt_athlete_categories (pt_user_id, slug) WHERE NOT is_system;

DROP POLICY IF EXISTS "PT can view system and own categories" ON public.pt_athlete_categories;
CREATE POLICY "PT can view system and own categories"
  ON public.pt_athlete_categories FOR SELECT TO authenticated
  USING (is_system OR pt_user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "PT can create own categories" ON public.pt_athlete_categories;
CREATE POLICY "PT can create own categories"
  ON public.pt_athlete_categories FOR INSERT TO authenticated
  WITH CHECK (NOT is_system AND pt_user_id = auth.uid() AND public.is_pt(auth.uid()));

DROP POLICY IF EXISTS "PT can update own categories" ON public.pt_athlete_categories;
CREATE POLICY "PT can update own categories"
  ON public.pt_athlete_categories FOR UPDATE TO authenticated
  USING (NOT is_system AND pt_user_id = auth.uid())
  WITH CHECK (NOT is_system AND pt_user_id = auth.uid());

DROP POLICY IF EXISTS "PT can delete own categories" ON public.pt_athlete_categories;
CREATE POLICY "PT can delete own categories"
  ON public.pt_athlete_categories FOR DELETE TO authenticated
  USING (NOT is_system AND pt_user_id = auth.uid());

DROP TRIGGER IF EXISTS update_pt_athlete_categories_updated_at ON public.pt_athlete_categories;
CREATE TRIGGER update_pt_athlete_categories_updated_at
  BEFORE UPDATE ON public.pt_athlete_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.pt_athlete_categories (pt_user_id, name, slug, is_system)
VALUES (NULL, 'In presenza', 'in_presenza', true),
       (NULL, 'Online', 'online', true),
       (NULL, 'Mix', 'mix', true)
ON CONFLICT DO NOTHING;

-- =============================================
-- 2) category_id on connections + backfill
-- =============================================
ALTER TABLE public.pt_atleta_connections
  ADD COLUMN IF NOT EXISTS category_id UUID NULL REFERENCES public.pt_athlete_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pt_atleta_connections_category
  ON public.pt_atleta_connections (pt_user_id, category_id);

UPDATE public.pt_atleta_connections c
SET category_id = cat.id
FROM public.pt_athlete_categories cat
WHERE cat.is_system
  AND cat.slug = COALESCE(c.training_modality, 'mix')
  AND c.category_id IS NULL;

-- =============================================
-- 3) RPC set_athlete_category
-- =============================================
CREATE OR REPLACE FUNCTION public.set_athlete_category(_connection_id UUID, _category_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pt UUID := auth.uid();
  v_slug TEXT;
BEGIN
  IF v_pt IS NULL THEN RAISE EXCEPTION 'Non autenticato'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.pt_atleta_connections
    WHERE id = _connection_id AND pt_user_id = v_pt
  ) THEN
    RAISE EXCEPTION 'Collegamento non trovato o non autorizzato';
  END IF;

  IF _category_id IS NOT NULL THEN
    SELECT slug INTO v_slug FROM public.pt_athlete_categories
    WHERE id = _category_id AND (is_system OR pt_user_id = v_pt);
    IF v_slug IS NULL THEN
      RAISE EXCEPTION 'Categoria non valida';
    END IF;
  END IF;

  UPDATE public.pt_atleta_connections
  SET category_id = _category_id,
      training_modality = CASE
        WHEN v_slug IN ('in_presenza','online','mix') THEN v_slug
        ELSE training_modality
      END,
      updated_at = now()
  WHERE id = _connection_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_athlete_category(UUID, UUID) TO authenticated;

-- =============================================
-- 4) _activate_pt_atleta_connection carries category
-- =============================================
CREATE OR REPLACE FUNCTION public._activate_pt_atleta_connection(_pt_user_id uuid, _atleta_user_id uuid, _requested_by uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conn_id UUID;
  v_modality TEXT;
  v_category UUID;
BEGIN
  SELECT training_modality, category_id INTO v_modality, v_category
  FROM public.pt_atleta_connections
  WHERE atleta_user_id = _atleta_user_id AND status = 'active'
  ORDER BY accepted_at DESC NULLS LAST LIMIT 1;

  IF v_category IS NULL THEN
    SELECT id INTO v_category FROM public.pt_athlete_categories
    WHERE is_system AND slug = COALESCE(v_modality, 'mix');
  END IF;

  SELECT id INTO v_conn_id
  FROM public.pt_atleta_connections
  WHERE pt_user_id = _pt_user_id AND atleta_user_id = _atleta_user_id;

  IF v_conn_id IS NOT NULL THEN
    UPDATE public.pt_atleta_connections
    SET status = 'active',
        accepted_at = COALESCE(accepted_at, now()),
        terminated_at = NULL,
        is_pt_active = true,
        training_modality = COALESCE(training_modality, v_modality, 'mix'),
        category_id = COALESCE(category_id, v_category),
        updated_at = now()
    WHERE id = v_conn_id;
    RETURN v_conn_id;
  END IF;

  INSERT INTO public.pt_atleta_connections (
    pt_user_id, atleta_user_id, status, requested_by, accepted_at, training_modality, category_id
  ) VALUES (
    _pt_user_id, _atleta_user_id, 'active', _requested_by, now(), COALESCE(v_modality, 'mix'), v_category
  )
  RETURNING id INTO v_conn_id;
  RETURN v_conn_id;
END;
$$;

-- =============================================
-- 5) get_ceded_athletes_for_pt exposes category
-- =============================================
DROP FUNCTION IF EXISTS public.get_ceded_athletes_for_pt();
CREATE FUNCTION public.get_ceded_athletes_for_pt()
RETURNS TABLE(
  atleta_user_id uuid, first_name text, last_name text, avatar_url text, email text,
  training_modality text, category_id uuid, category_name text, fitness_level text,
  current_pt_user_id uuid, current_pt_first_name text, current_pt_last_name text,
  transferred_at timestamp with time zone, is_recallable boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pt_id UUID := auth.uid();
BEGIN
  IF v_pt_id IS NULL OR NOT public.is_pt(v_pt_id) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  RETURN QUERY
  WITH latest_out AS (
    SELECT DISTINCT ON (t.atleta_user_id)
      t.atleta_user_id, t.to_pt_user_id, t.completed_at
    FROM public.pt_atleta_transfers t
    WHERE t.from_pt_user_id = v_pt_id AND t.action = 'transfer_out' AND t.status = 'completed'
    ORDER BY t.atleta_user_id, t.completed_at DESC NULLS LAST, t.created_at DESC
  ),
  later_recall AS (
    SELECT DISTINCT ON (t.atleta_user_id) t.atleta_user_id, t.completed_at
    FROM public.pt_atleta_transfers t
    WHERE t.to_pt_user_id = v_pt_id AND t.action = 'recall' AND t.status = 'completed'
    ORDER BY t.atleta_user_id, t.completed_at DESC NULLS LAST, t.created_at DESC
  )
  SELECT
    lo.atleta_user_id,
    ap.first_name,
    ap.last_name,
    ap.avatar_url,
    ap.email,
    COALESCE(dest.training_modality, owner_conn.training_modality, 'mix') AS training_modality,
    COALESCE(dest.category_id, owner_conn.category_id) AS category_id,
    cat.name AS category_name,
    atl.fitness_level,
    dest.pt_user_id AS current_pt_user_id,
    cp.first_name AS current_pt_first_name,
    cp.last_name AS current_pt_last_name,
    lo.completed_at AS transferred_at,
    (
      dest.pt_user_id IS NOT NULL
      AND dest.status = 'active'
      AND (lr.completed_at IS NULL OR lr.completed_at < lo.completed_at)
    ) AS is_recallable
  FROM latest_out lo
  LEFT JOIN later_recall lr ON lr.atleta_user_id = lo.atleta_user_id
  INNER JOIN public.profiles ap ON ap.user_id = lo.atleta_user_id
  LEFT JOIN public.atleta_profiles atl ON atl.user_id = lo.atleta_user_id
  LEFT JOIN public.pt_atleta_connections dest
    ON dest.atleta_user_id = lo.atleta_user_id
    AND dest.pt_user_id = lo.to_pt_user_id
    AND dest.status = 'active'
  LEFT JOIN public.profiles cp ON cp.user_id = dest.pt_user_id
  LEFT JOIN public.pt_atleta_connections owner_conn
    ON owner_conn.atleta_user_id = lo.atleta_user_id
    AND owner_conn.pt_user_id = v_pt_id
  LEFT JOIN public.pt_athlete_categories cat
    ON cat.id = COALESCE(dest.category_id, owner_conn.category_id)
  WHERE lr.completed_at IS NULL OR lr.completed_at < lo.completed_at
  ORDER BY lo.completed_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ceded_athletes_for_pt() TO authenticated;

-- =============================================
-- 6) mark_messages_as_read RPC
-- =============================================
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(_chat_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non autenticato'; END IF;
  IF NOT public.is_chat_participant(v_uid, _chat_id) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  UPDATE public.messages
  SET is_read = true, read_at = now()
  WHERE chat_id = _chat_id
    AND sender_user_id <> v_uid
    AND is_read = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_messages_as_read(UUID) TO authenticated;