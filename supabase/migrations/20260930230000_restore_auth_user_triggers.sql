-- Ripristina il trigger di registrazione su auth.users, perso con l'import
-- del database dal vecchio backend (agosto 2026). Senza trigger le nuove
-- registrazioni non ricevono user_roles / profiles / pt_profiles / atleta_profiles.
-- Idempotente: la funzione è identica a 20260122161128, il trigger viene ricreato.

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_role app_role;
BEGIN
  -- Ottieni il ruolo dai metadata dell'utente
  BEGIN
    selected_role := (NEW.raw_user_meta_data->>'role')::app_role;
  EXCEPTION WHEN OTHERS THEN
    selected_role := NULL;
  END;
  
  -- Se il ruolo non è valido o è admin, esci (admin creati solo via DB)
  IF selected_role IS NULL OR selected_role = 'admin' THEN
    RETURN NEW;
  END IF;
  
  -- Inserisci il ruolo
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, selected_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Crea profilo base
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Crea profilo specifico per ruolo
  IF selected_role = 'pt' THEN
    INSERT INTO public.pt_profiles (user_id, status)
    VALUES (NEW.id, 'registrato')
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF selected_role = 'atleta' THEN
    INSERT INTO public.atleta_profiles (user_id, status)
    VALUES (NEW.id, 'non_collegato')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Backfill per eventuali utenti registrati mentre il trigger mancava.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, (u.raw_user_meta_data->>'role')::app_role
FROM auth.users u
WHERE u.raw_user_meta_data->>'role' IN ('pt', 'atleta')
  AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id)
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.profiles (user_id, email)
SELECT r.user_id, u.email
FROM public.user_roles r
JOIN auth.users u ON u.id = r.user_id
WHERE r.role IN ('pt', 'atleta')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.pt_profiles (user_id, status)
SELECT r.user_id, 'registrato'
FROM public.user_roles r
WHERE r.role = 'pt'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.atleta_profiles (user_id, status)
SELECT r.user_id, 'non_collegato'
FROM public.user_roles r
WHERE r.role = 'atleta'
ON CONFLICT (user_id) DO NOTHING;
