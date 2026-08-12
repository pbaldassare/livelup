-- =====================================================
-- PT service modality: in_presenza | online | mix
-- Mandatory on profile; existing PTs → mix.
-- Keeps offers_online / offers_in_person / online_only in sync.
-- =====================================================

ALTER TABLE public.pt_profiles
  ADD COLUMN IF NOT EXISTS service_modality TEXT;

UPDATE public.pt_profiles
SET service_modality = 'mix'
WHERE service_modality IS NULL
   OR service_modality NOT IN ('in_presenza', 'online', 'mix');

ALTER TABLE public.pt_profiles
  ALTER COLUMN service_modality SET DEFAULT 'mix';

ALTER TABLE public.pt_profiles
  ALTER COLUMN service_modality SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pt_profiles_service_modality_check'
  ) THEN
    ALTER TABLE public.pt_profiles
      ADD CONSTRAINT pt_profiles_service_modality_check
      CHECK (service_modality IN ('in_presenza', 'online', 'mix'));
  END IF;
END $$;

COMMENT ON COLUMN public.pt_profiles.service_modality IS
  'Modalità di servizio del PT: in_presenza, online, o mix. Obbligatoria; default mix.';

-- Align legacy boolean flags for all rows
UPDATE public.pt_profiles
SET
  offers_online = (service_modality IN ('online', 'mix')),
  offers_in_person = (service_modality IN ('in_presenza', 'mix')),
  online_only = (service_modality = 'online');

CREATE OR REPLACE FUNCTION public.sync_pt_service_modality_flags()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.service_modality IS NULL OR NEW.service_modality NOT IN ('in_presenza', 'online', 'mix') THEN
    NEW.service_modality := 'mix';
  END IF;

  NEW.offers_online := NEW.service_modality IN ('online', 'mix');
  NEW.offers_in_person := NEW.service_modality IN ('in_presenza', 'mix');
  NEW.online_only := NEW.service_modality = 'online';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_pt_service_modality_flags ON public.pt_profiles;
CREATE TRIGGER trg_sync_pt_service_modality_flags
  BEFORE INSERT OR UPDATE OF service_modality ON public.pt_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_pt_service_modality_flags();

CREATE INDEX IF NOT EXISTS idx_pt_profiles_service_modality
  ON public.pt_profiles (service_modality);
