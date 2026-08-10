-- =====================================================
-- Categorie cliente atleta: 3 globali fisse + catalogo PT
-- Ogni PT vede le 3 di sistema + solo le proprie (doppioni ok).
-- =====================================================

-- Fixed IDs for system categories (stable across environments)
-- in_presenza / online / mix
CREATE TABLE IF NOT EXISTS public.pt_athlete_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT,
  color TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pt_athlete_categories_system_owner_chk CHECK (
    (is_system = true AND pt_user_id IS NULL)
    OR (is_system = false AND pt_user_id IS NOT NULL)
  ),
  CONSTRAINT pt_athlete_categories_name_len_chk CHECK (
    char_length(trim(name)) BETWEEN 1 AND 60
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pt_athlete_categories_system_slug
  ON public.pt_athlete_categories (slug)
  WHERE is_system = true AND slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pt_athlete_categories_pt
  ON public.pt_athlete_categories (pt_user_id, is_active, sort_order)
  WHERE pt_user_id IS NOT NULL;

COMMENT ON TABLE public.pt_athlete_categories IS
  'Categorie cliente: 3 di sistema (pt_user_id NULL) + catalogo privato per PT.';

INSERT INTO public.pt_athlete_categories (id, pt_user_id, name, slug, color, sort_order, is_system, is_active)
VALUES
  ('a1111111-1111-4111-8111-111111111101', NULL, 'In presenza', 'in_presenza', NULL, 10, true, true),
  ('a1111111-1111-4111-8111-111111111102', NULL, 'Online', 'online', NULL, 20, true, true),
  ('a1111111-1111-4111-8111-111111111103', NULL, 'Mix', 'mix', NULL, 30, true, true)
ON CONFLICT (id) DO NOTHING;

-- Link on PT–athlete connection
ALTER TABLE public.pt_atleta_connections
  ADD COLUMN IF NOT EXISTS category_id UUID
    REFERENCES public.pt_athlete_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pt_atleta_connections_category
  ON public.pt_atleta_connections (pt_user_id, category_id)
  WHERE status = 'active';

-- Backfill from legacy training_modality
UPDATE public.pt_atleta_connections c
SET category_id = cat.id
FROM public.pt_athlete_categories cat
WHERE c.category_id IS NULL
  AND cat.is_system = true
  AND cat.slug = COALESCE(c.training_modality, 'mix');

UPDATE public.pt_atleta_connections
SET category_id = 'a1111111-1111-4111-8111-111111111103'
WHERE category_id IS NULL;

-- Default for new rows
ALTER TABLE public.pt_atleta_connections
  ALTER COLUMN category_id SET DEFAULT 'a1111111-1111-4111-8111-111111111103';

-- Keep training_modality in sync for system categories (legacy clients / filters)
CREATE OR REPLACE FUNCTION public.sync_connection_training_modality_from_category()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug TEXT;
  v_is_system BOOLEAN;
BEGIN
  IF NEW.category_id IS NULL THEN
    NEW.training_modality := COALESCE(NEW.training_modality, 'mix');
    RETURN NEW;
  END IF;

  SELECT slug, is_system INTO v_slug, v_is_system
  FROM public.pt_athlete_categories
  WHERE id = NEW.category_id;

  IF v_is_system AND v_slug IS NOT NULL THEN
    NEW.training_modality := v_slug;
  ELSE
    -- Custom category: clear enum-style field (CHECK allows NULL)
    NEW.training_modality := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_training_modality_from_category ON public.pt_atleta_connections;
CREATE TRIGGER trg_sync_training_modality_from_category
  BEFORE INSERT OR UPDATE OF category_id ON public.pt_atleta_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_connection_training_modality_from_category();

-- =====================================================
-- RLS
-- =====================================================

ALTER TABLE public.pt_athlete_categories ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pt_athlete_categories TO authenticated;
GRANT ALL ON public.pt_athlete_categories TO service_role;

DROP POLICY IF EXISTS "pt_athlete_categories_select" ON public.pt_athlete_categories;
CREATE POLICY "pt_athlete_categories_select"
  ON public.pt_athlete_categories
  FOR SELECT
  TO authenticated
  USING (
    is_system = true
    OR pt_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "pt_athlete_categories_insert" ON public.pt_athlete_categories;
CREATE POLICY "pt_athlete_categories_insert"
  ON public.pt_athlete_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_system = false
    AND pt_user_id = auth.uid()
    AND public.is_pt(auth.uid())
  );

DROP POLICY IF EXISTS "pt_athlete_categories_update" ON public.pt_athlete_categories;
CREATE POLICY "pt_athlete_categories_update"
  ON public.pt_athlete_categories
  FOR UPDATE
  TO authenticated
  USING (
    is_system = false
    AND pt_user_id = auth.uid()
  )
  WITH CHECK (
    is_system = false
    AND pt_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "pt_athlete_categories_delete" ON public.pt_athlete_categories;
CREATE POLICY "pt_athlete_categories_delete"
  ON public.pt_athlete_categories
  FOR DELETE
  TO authenticated
  USING (
    is_system = false
    AND pt_user_id = auth.uid()
  );

-- =====================================================
-- Validate category on assign (system or own)
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_athlete_category(
  _connection_id UUID,
  _category_id UUID
)
RETURNS public.pt_atleta_connections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pt UUID := auth.uid();
  v_conn public.pt_atleta_connections;
  v_ok BOOLEAN;
BEGIN
  IF v_pt IS NULL OR NOT public.is_pt(v_pt) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  SELECT * INTO v_conn
  FROM public.pt_atleta_connections
  WHERE id = _connection_id
    AND pt_user_id = v_pt
    AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Connessione non trovata';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.pt_athlete_categories c
    WHERE c.id = _category_id
      AND c.is_active = true
      AND (c.is_system = true OR c.pt_user_id = v_pt)
  ) INTO v_ok;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'Categoria non valida';
  END IF;

  UPDATE public.pt_atleta_connections
  SET
    category_id = _category_id,
    updated_at = now()
  WHERE id = _connection_id
  RETURNING * INTO v_conn;

  RETURN v_conn;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_athlete_category(UUID, UUID) TO authenticated;

-- =====================================================
-- Copy category on connection activation (transfer/accept)
-- System categories are shared; custom → Mix default.
-- =====================================================

CREATE OR REPLACE FUNCTION public._activate_pt_atleta_connection(
  _pt_user_id UUID,
  _atleta_user_id UUID,
  _requested_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conn_id UUID;
  v_modality TEXT;
  v_category_id UUID;
  v_prev_cat UUID;
  v_prev_is_system BOOLEAN;
BEGIN
  SELECT training_modality, category_id
  INTO v_modality, v_prev_cat
  FROM public.pt_atleta_connections
  WHERE atleta_user_id = _atleta_user_id
    AND status = 'active'
  ORDER BY accepted_at DESC NULLS LAST
  LIMIT 1;

  IF v_prev_cat IS NOT NULL THEN
    SELECT is_system INTO v_prev_is_system
    FROM public.pt_athlete_categories
    WHERE id = v_prev_cat;

    IF v_prev_is_system THEN
      v_category_id := v_prev_cat;
    ELSE
      v_category_id := 'a1111111-1111-4111-8111-111111111103'; -- Mix
    END IF;
  ELSE
    v_category_id := COALESCE(
      (
        SELECT id FROM public.pt_athlete_categories
        WHERE is_system AND slug = COALESCE(v_modality, 'mix')
        LIMIT 1
      ),
      'a1111111-1111-4111-8111-111111111103'::uuid
    );
  END IF;

  SELECT id INTO v_conn_id
  FROM public.pt_atleta_connections
  WHERE pt_user_id = _pt_user_id
    AND atleta_user_id = _atleta_user_id;

  IF v_conn_id IS NOT NULL THEN
    UPDATE public.pt_atleta_connections
    SET
      status = 'active',
      accepted_at = COALESCE(accepted_at, now()),
      terminated_at = NULL,
      is_pt_active = true,
      category_id = COALESCE(category_id, v_category_id),
      training_modality = COALESCE(training_modality, v_modality, 'mix'),
      updated_at = now()
    WHERE id = v_conn_id;
    RETURN v_conn_id;
  END IF;

  INSERT INTO public.pt_atleta_connections (
    pt_user_id,
    atleta_user_id,
    status,
    requested_by,
    accepted_at,
    training_modality,
    category_id
  ) VALUES (
    _pt_user_id,
    _atleta_user_id,
    'active',
    _requested_by,
    now(),
    COALESCE(v_modality, 'mix'),
    v_category_id
  )
  RETURNING id INTO v_conn_id;

  RETURN v_conn_id;
END;
$$;

REVOKE ALL ON FUNCTION public._activate_pt_atleta_connection(UUID, UUID, UUID) FROM PUBLIC;

-- =====================================================
-- get_ceded_athletes_for_pt: expose category fields
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_ceded_athletes_for_pt()
RETURNS TABLE (
  atleta_user_id UUID,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  email TEXT,
  training_modality TEXT,
  category_id UUID,
  category_name TEXT,
  category_color TEXT,
  category_is_system BOOLEAN,
  fitness_level TEXT,
  current_pt_user_id UUID,
  current_pt_first_name TEXT,
  current_pt_last_name TEXT,
  transferred_at TIMESTAMPTZ,
  is_recallable BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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
      t.atleta_user_id,
      t.to_pt_user_id,
      t.completed_at
    FROM public.pt_atleta_transfers t
    WHERE t.from_pt_user_id = v_pt_id
      AND t.action = 'transfer_out'
      AND t.status = 'completed'
    ORDER BY t.atleta_user_id, t.completed_at DESC NULLS LAST, t.created_at DESC
  ),
  later_recall AS (
    SELECT DISTINCT ON (t.atleta_user_id)
      t.atleta_user_id,
      t.completed_at
    FROM public.pt_atleta_transfers t
    WHERE t.to_pt_user_id = v_pt_id
      AND t.action = 'recall'
      AND t.status = 'completed'
    ORDER BY t.atleta_user_id, t.completed_at DESC NULLS LAST, t.created_at DESC
  )
  SELECT
    lo.atleta_user_id,
    ap.first_name,
    ap.last_name,
    ap.avatar_url,
    ap.email,
    COALESCE(cat.slug, dest.training_modality, owner_conn.training_modality, 'mix') AS training_modality,
    COALESCE(dest.category_id, owner_conn.category_id) AS category_id,
    cat.name AS category_name,
    cat.color AS category_color,
    cat.is_system AS category_is_system,
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
