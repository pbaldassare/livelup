import fs from 'node:fs';

const src = 'C:/Users/Utente/Downloads/auth_users_identities.sql';
const out = 'C:/Users/Utente/Downloads/auth_import_wrapped.sql';
const body = fs.readFileSync(src, 'utf8');
fs.writeFileSync(
  out,
  [
    'alter table auth.users disable trigger all;',
    'alter table auth.identities disable trigger all;',
    body.trim(),
    'alter table auth.identities enable trigger all;',
    'alter table auth.users enable trigger all;',
    '',
  ].join('\n'),
);
console.log('wrote', out, fs.statSync(out).size);
