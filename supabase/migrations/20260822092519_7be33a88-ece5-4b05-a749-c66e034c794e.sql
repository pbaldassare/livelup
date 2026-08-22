create or replace function public.tmp_export_auth()
returns setof text
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $fn$
begin
  return query
  select format(
    'INSERT INTO auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,invited_at,confirmation_token,confirmation_sent_at,recovery_token,recovery_sent_at,email_change_token_new,email_change,email_change_sent_at,last_sign_in_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,created_at,updated_at,phone,phone_confirmed_at,phone_change,phone_change_token,phone_change_sent_at,email_change_token_current,email_change_confirm_status,banned_until,reauthentication_token,reauthentication_sent_at,is_sso_user,deleted_at,is_anonymous) VALUES (%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L) ON CONFLICT (id) DO NOTHING;',
    u.instance_id,u.id,u.aud,u.role,u.email,u.encrypted_password,u.email_confirmed_at,u.invited_at,u.confirmation_token,u.confirmation_sent_at,u.recovery_token,u.recovery_sent_at,u.email_change_token_new,u.email_change,u.email_change_sent_at,u.last_sign_in_at,u.raw_app_meta_data,u.raw_user_meta_data,u.is_super_admin,u.created_at,u.updated_at,u.phone,u.phone_confirmed_at,u.phone_change,u.phone_change_token,u.phone_change_sent_at,u.email_change_token_current,u.email_change_confirm_status,u.banned_until,u.reauthentication_token,u.reauthentication_sent_at,u.is_sso_user,u.deleted_at,u.is_anonymous)
  from auth.users u order by u.created_at;

  return query
  select format(
    'INSERT INTO auth.identities (provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at,id) VALUES (%L,%L,%L,%L,%L,%L,%L,%L) ON CONFLICT (id) DO NOTHING;',
    i.provider_id,i.user_id,i.identity_data,i.provider,i.last_sign_in_at,i.created_at,i.updated_at,i.id)
  from auth.identities i;
end;
$fn$;
grant execute on function public.tmp_export_auth() to postgres, service_role;