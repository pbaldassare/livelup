-- =====================================================
-- SISTEMA ADMIN + REGISTRAZIONE AUTOMATICA RUOLI
-- =====================================================

-- Abilita pgcrypto se non già abilitata
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1. Funzione per creare admin iniziale (one-shot, verrà rimossa dopo l'uso)
CREATE OR REPLACE FUNCTION public.create_initial_admin(
  admin_email TEXT,
  admin_password TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Verifica che non esistano già admin
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RAISE EXCEPTION 'Un admin esiste già nel sistema';
  END IF;

  -- Genera nuovo UUID
  new_user_id := gen_random_uuid();

  -- Crea utente in auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    admin_email,
    extensions.crypt(admin_password, extensions.gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"admin"}'::jsonb,
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    ''
  );

  -- Crea identity per l'utente
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    admin_email,
    jsonb_build_object('sub', new_user_id::text, 'email', admin_email),
    'email',
    now(),
    now(),
    now()
  );

  -- Crea profilo base
  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (new_user_id, admin_email, 'Admin', 'FitPlatform');

  -- Assegna ruolo admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, 'admin');

  RETURN new_user_id;
END;
$$;

-- 2. Trigger per assegnazione automatica ruoli durante registrazione
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

-- Crea il trigger (drop se esiste già)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- 3. Esegui creazione admin
SELECT public.create_initial_admin('admin@fitplatform.com', 'Leone123!');

-- 4. Rimuovi la funzione pericolosa dopo l'uso
DROP FUNCTION public.create_initial_admin(TEXT, TEXT);