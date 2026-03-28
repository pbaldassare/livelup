
-- Drop duplicate SELECT policies on pt_profiles (ALL policy already covers SELECT)
DROP POLICY IF EXISTS "Admins can view all PT profiles" ON public.pt_profiles;

-- Drop duplicate SELECT policies on atleta_profiles
DROP POLICY IF EXISTS "Admins can view all atleta profiles" ON public.atleta_profiles;

-- Drop duplicate SELECT policies on profiles (if exists)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
