-- =====================================================
-- Libreria protocolli PT + preferiti (riusabili tra schede)
-- Set standard NON è un protocollo: resta pratica esercizio.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.pt_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- Allineato allo schema Cloud Lovable (non usare colonna `type`)
  protocol_type TEXT NOT NULL CHECK (protocol_type <> 'SET' AND length(trim(protocol_type)) > 0),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  notes TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pt_protocols_pt_user ON public.pt_protocols(pt_user_id);
CREATE INDEX IF NOT EXISTS idx_pt_protocols_type ON public.pt_protocols(protocol_type);

ALTER TABLE public.pt_protocols ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pt_protocols TO authenticated;
GRANT ALL ON public.pt_protocols TO service_role;

CREATE POLICY "PT manage own protocols"
  ON public.pt_protocols FOR ALL TO authenticated
  USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()))
  WITH CHECK (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

CREATE POLICY "Admins manage all pt_protocols"
  ON public.pt_protocols FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_pt_protocols_updated_at ON public.pt_protocols;
CREATE TRIGGER trg_pt_protocols_updated_at
  BEFORE UPDATE ON public.pt_protocols
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Preferiti protocolli
CREATE TABLE IF NOT EXISTS public.pt_favorite_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.pt_protocols(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pt_user_id, protocol_id)
);

CREATE INDEX IF NOT EXISTS idx_pt_favorite_protocols_pt ON public.pt_favorite_protocols(pt_user_id);
CREATE INDEX IF NOT EXISTS idx_pt_favorite_protocols_protocol ON public.pt_favorite_protocols(protocol_id);

ALTER TABLE public.pt_favorite_protocols ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.pt_favorite_protocols TO authenticated;
GRANT ALL ON public.pt_favorite_protocols TO service_role;

CREATE POLICY "PT view own favorite protocols"
  ON public.pt_favorite_protocols FOR SELECT TO authenticated
  USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

CREATE POLICY "PT add own favorite protocols"
  ON public.pt_favorite_protocols FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

CREATE POLICY "PT remove own favorite protocols"
  ON public.pt_favorite_protocols FOR DELETE TO authenticated
  USING (auth.uid() = pt_user_id AND public.is_pt(auth.uid()));

CREATE POLICY "Admins view all favorite protocols"
  ON public.pt_favorite_protocols FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Estendi enum protocol_type per template_blocks / workout_blocks
DO $$ BEGIN
  ALTER TYPE public.protocol_type ADD VALUE IF NOT EXISTS 'SUPERSET';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.protocol_type ADD VALUE IF NOT EXISTS 'LADDER';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.protocol_type ADD VALUE IF NOT EXISTS 'DEAD_LADDER';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.protocol_type ADD VALUE IF NOT EXISTS 'TABATA';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.protocol_type ADD VALUE IF NOT EXISTS 'HIIT';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.protocol_type ADD VALUE IF NOT EXISTS 'RXT';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.protocol_type ADD VALUE IF NOT EXISTS 'RUNNING_TOTAL';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Link opzionale blocco scheda → libreria
ALTER TABLE public.template_blocks
  ADD COLUMN IF NOT EXISTS library_protocol_id UUID REFERENCES public.pt_protocols(id) ON DELETE SET NULL;

ALTER TABLE public.workout_blocks
  ADD COLUMN IF NOT EXISTS library_protocol_id UUID REFERENCES public.pt_protocols(id) ON DELETE SET NULL;

-- Nome display protocollo sulla riga esercizio-carrier (compatibile player atleta)
ALTER TABLE public.template_exercises
  ADD COLUMN IF NOT EXISTS protocol_name TEXT;

ALTER TABLE public.workout_exercises
  ADD COLUMN IF NOT EXISTS protocol_name TEXT;

ALTER TABLE public.template_exercises
  ADD COLUMN IF NOT EXISTS library_protocol_id UUID REFERENCES public.pt_protocols(id) ON DELETE SET NULL;

ALTER TABLE public.workout_exercises
  ADD COLUMN IF NOT EXISTS library_protocol_id UUID REFERENCES public.pt_protocols(id) ON DELETE SET NULL;

-- Backfill nome protocollo da esercizio host dove manca
UPDATE public.template_exercises te
SET protocol_name = COALESCE(
  NULLIF(trim(te.protocol_name), ''),
  NULLIF(trim(te.protocol_params->>'protocol_name'), ''),
  (SELECT e.name FROM public.exercises e WHERE e.id = te.exercise_id)
)
WHERE te.protocol_type IS NOT NULL
  AND te.protocol_type <> 'SET'
  AND (te.protocol_name IS NULL OR trim(te.protocol_name) = '');
