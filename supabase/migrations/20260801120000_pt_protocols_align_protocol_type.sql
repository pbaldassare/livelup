-- =====================================================
-- Allinea pt_protocols allo schema Cloud Lovable
-- (colonna protocol_type invece di type)
-- =====================================================

-- Se esiste solo `type` (TEXT), aggiungi protocol_type e copia
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pt_protocols' AND column_name = 'type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pt_protocols' AND column_name = 'protocol_type'
  ) THEN
    ALTER TABLE public.pt_protocols
      ADD COLUMN protocol_type text;

    UPDATE public.pt_protocols
    SET protocol_type = type::text
    WHERE protocol_type IS NULL;

    ALTER TABLE public.pt_protocols
      ALTER COLUMN protocol_type SET NOT NULL;
  END IF;
END $$;

-- Colonne opzionali usate dal Cloud
ALTER TABLE public.pt_protocols
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- Assicura enum values usati dai protocolli
DO $$ BEGIN ALTER TYPE public.protocol_type ADD VALUE IF NOT EXISTS 'SUPERSET'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.protocol_type ADD VALUE IF NOT EXISTS 'LADDER'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.protocol_type ADD VALUE IF NOT EXISTS 'DEAD_LADDER'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.protocol_type ADD VALUE IF NOT EXISTS 'TABATA'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.protocol_type ADD VALUE IF NOT EXISTS 'HIIT'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.protocol_type ADD VALUE IF NOT EXISTS 'RXT'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.protocol_type ADD VALUE IF NOT EXISTS 'RUNNING_TOTAL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.protocol_type ADD VALUE IF NOT EXISTS 'TOP_SET_BACKOFF'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Se protocol_type è enum e manca TABATA ecc., i valori sopra bastano.
-- Se è text, nessun cast necessario.

NOTIFY pgrst, 'reload schema';
