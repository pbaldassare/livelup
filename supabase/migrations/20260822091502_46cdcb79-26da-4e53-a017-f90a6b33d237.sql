CREATE OR REPLACE FUNCTION public.tmp_export_auth()
RETURNS TABLE(line text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT format('INSERT INTO auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,invited_at,confirmation_token,confirmation_sent_at,recovery_token,recovery_sent_at,email_change_token_new,email_change,email_change_sent_at,last_sign_in_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,created_at,updated_at,phone,phone_confirmed_at,phone_change,phone_change_token,phone_change_sent_at,email_change_token_current,email_change_confirm_status,banned_until,reauthentication_token,reauthentication_sent_at,is_sso_user,deleted_at,is_anonymous) VALUES (%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L) ON CONFLICT (id) DO NOTHING;',
    instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,invited_at,confirmation_token,confirmation_sent_at,recovery_token,recovery_sent_at,email_change_token_new,email_change,email_change_sent_at,last_sign_in_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,created_at,updated_at,phone,phone_confirmed_at,phone_change,phone_change_token,phone_change_sent_at,email_change_token_current,email_change_confirm_status,banned_until,reauthentication_token,reauthentication_sent_at,is_sso_user,deleted_at,is_anonymous)
  FROM auth.users
  UNION ALL
  SELECT format('INSERT INTO auth.identities (provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at,id) VALUES (%L,%L,%L,%L,%L,%L,%L,%L) ON CONFLICT (id) DO NOTHING;',
    provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at,id)
  FROM auth.identities;
$$;
REVOKE ALL ON FUNCTION public.tmp_export_auth() FROM public;
GRANT EXECUTE ON FUNCTION public.tmp_export_auth() TO sandbox_exec;