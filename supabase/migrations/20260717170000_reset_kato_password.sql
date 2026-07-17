-- Reset password atleta kato.aifp@gmail.com
-- Password temporanea: KatoLivel2026!
-- Chiedere di cambiarla al primo accesso.

UPDATE auth.users
SET
  encrypted_password = extensions.crypt('KatoLivel2026!', extensions.gen_salt('bf')),
  updated_at = now()
WHERE lower(email) = lower('kato.aifp@gmail.com');
