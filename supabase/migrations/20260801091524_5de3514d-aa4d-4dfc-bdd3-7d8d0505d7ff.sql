-- 1) Enum extension
ALTER TYPE public.protocol_type ADD VALUE IF NOT EXISTS 'SUPERSET';
ALTER TYPE public.protocol_type ADD VALUE IF NOT EXISTS 'LADDER';
ALTER TYPE public.protocol_type ADD VALUE IF NOT EXISTS 'DEAD_LADDER';
ALTER TYPE public.protocol_type ADD VALUE IF NOT EXISTS 'TABATA';
ALTER TYPE public.protocol_type ADD VALUE IF NOT EXISTS 'HIIT';
ALTER TYPE public.protocol_type ADD VALUE IF NOT EXISTS 'RXT';
ALTER TYPE public.protocol_type ADD VALUE IF NOT EXISTS 'RUNNING_TOTAL';

-- 2) pt_protocols
CREATE TABLE IF NOT EXISTS public.pt_protocols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pt_user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  protocol_type public.protocol_type NOT NULL DEFAULT 'SET',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pt_protocols TO authenticated;
GRANT ALL ON public.pt_protocols TO service_role;
ALTER TABLE public.pt_protocols ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pt_protocols' AND policyname='pt_protocols_select') THEN
    CREATE POLICY "pt_protocols_select" ON public.pt_protocols
      FOR SELECT TO authenticated
      USING (pt_user_id = auth.uid() OR is_public = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pt_protocols' AND policyname='pt_protocols_insert') THEN
    CREATE POLICY "pt_protocols_insert" ON public.pt_protocols
      FOR INSERT TO authenticated WITH CHECK (pt_user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pt_protocols' AND policyname='pt_protocols_update') THEN
    CREATE POLICY "pt_protocols_update" ON public.pt_protocols
      FOR UPDATE TO authenticated USING (pt_user_id = auth.uid()) WITH CHECK (pt_user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pt_protocols' AND policyname='pt_protocols_delete') THEN
    CREATE POLICY "pt_protocols_delete" ON public.pt_protocols
      FOR DELETE TO authenticated USING (pt_user_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pt_protocols_pt_user ON public.pt_protocols(pt_user_id);

DROP TRIGGER IF EXISTS update_pt_protocols_updated_at ON public.pt_protocols;
CREATE TRIGGER update_pt_protocols_updated_at
  BEFORE UPDATE ON public.pt_protocols
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) pt_favorite_protocols
CREATE TABLE IF NOT EXISTS public.pt_favorite_protocols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pt_user_id UUID NOT NULL,
  protocol_id UUID NOT NULL REFERENCES public.pt_protocols(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pt_user_id, protocol_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pt_favorite_protocols TO authenticated;
GRANT ALL ON public.pt_favorite_protocols TO service_role;
ALTER TABLE public.pt_favorite_protocols ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pt_favorite_protocols' AND policyname='pt_favorite_protocols_all') THEN
    CREATE POLICY "pt_favorite_protocols_all" ON public.pt_favorite_protocols
      FOR ALL TO authenticated
      USING (pt_user_id = auth.uid()) WITH CHECK (pt_user_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pt_favorite_protocols_pt_user ON public.pt_favorite_protocols(pt_user_id);

DROP TRIGGER IF EXISTS update_pt_favorite_protocols_updated_at ON public.pt_favorite_protocols;
CREATE TRIGGER update_pt_favorite_protocols_updated_at
  BEFORE UPDATE ON public.pt_favorite_protocols
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Columns on exercises / blocks
ALTER TABLE public.template_exercises ADD COLUMN IF NOT EXISTS protocol_name TEXT;
ALTER TABLE public.template_exercises ADD COLUMN IF NOT EXISTS library_protocol_id UUID REFERENCES public.pt_protocols(id) ON DELETE SET NULL;

ALTER TABLE public.workout_exercises ADD COLUMN IF NOT EXISTS protocol_name TEXT;
ALTER TABLE public.workout_exercises ADD COLUMN IF NOT EXISTS library_protocol_id UUID REFERENCES public.pt_protocols(id) ON DELETE SET NULL;

ALTER TABLE public.template_blocks ADD COLUMN IF NOT EXISTS library_protocol_id UUID REFERENCES public.pt_protocols(id) ON DELETE SET NULL;
ALTER TABLE public.workout_blocks ADD COLUMN IF NOT EXISTS library_protocol_id UUID REFERENCES public.pt_protocols(id) ON DELETE SET NULL;