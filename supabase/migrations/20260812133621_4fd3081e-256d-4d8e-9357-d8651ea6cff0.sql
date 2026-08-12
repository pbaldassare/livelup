ALTER TABLE public.pt_profiles
  ADD COLUMN IF NOT EXISTS service_modality TEXT NOT NULL DEFAULT 'mix';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pt_profiles_service_modality_check'
  ) THEN
    ALTER TABLE public.pt_profiles
      ADD CONSTRAINT pt_profiles_service_modality_check
      CHECK (service_modality IN ('in_presenza','online','mix'));
  END IF;
END $$;

UPDATE public.pt_profiles SET service_modality = 'mix';

UPDATE public.pt_profiles
SET offers_online = true, offers_in_person = true, online_only = false
WHERE service_modality = 'mix';

CREATE OR REPLACE FUNCTION public.sync_pt_service_modality_flags()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.service_modality = 'online' THEN
    NEW.offers_online := true;
    NEW.offers_in_person := false;
    NEW.online_only := true;
  ELSIF NEW.service_modality = 'in_presenza' THEN
    NEW.offers_online := false;
    NEW.offers_in_person := true;
    NEW.online_only := false;
  ELSE
    NEW.offers_online := true;
    NEW.offers_in_person := true;
    NEW.online_only := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_pt_service_modality_flags ON public.pt_profiles;
CREATE TRIGGER trg_sync_pt_service_modality_flags
BEFORE INSERT OR UPDATE OF service_modality ON public.pt_profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_pt_service_modality_flags();

CREATE INDEX IF NOT EXISTS idx_pt_profiles_service_modality
  ON public.pt_profiles (service_modality);