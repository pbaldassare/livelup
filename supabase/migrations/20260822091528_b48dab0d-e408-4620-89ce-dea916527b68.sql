DROP FUNCTION IF EXISTS public.tmp_export_auth();
REVOKE USAGE ON SCHEMA auth FROM sandbox_exec;
REVOKE SELECT ON auth.users, auth.identities FROM sandbox_exec;