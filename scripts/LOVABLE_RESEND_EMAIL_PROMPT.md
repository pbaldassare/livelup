# Prompt Lovable Cloud — Resend (email PT + atleta)

Incolla questo blocco in Lovable. **Non committare la API key nel repo.**

```text
Sei Lovable Cloud per Livelapp (project ref kxgaqnksylntokyrpaxp).

EMAIL / RESEND — applica solo questo:

1) Secrets Edge Functions (sostituisci i valori, non stamparli in log):
   - RESEND_API_KEY = <la chiave Resend re_… che l’utente ti fornisce in chat, non nel git>
   - RESEND_FROM_EMAIL = Livelapp <noreply@livelapp.it>
     (usa un mittente su dominio GIÀ verificato in Resend; se livelapp.it non è verificato, usa il dominio verificato)
   - SITE_URL = https://livelapp.iaconnect.it
   - SEND_EMAIL_HOOK_SECRET = il secret dell’hook Auth “Send Email” (formato whsec_… / v1,…)

2) Auth Hook “Send Email”:
   Punta a https://kxgaqnksylntokyrpaxp.supabase.co/functions/v1/auth-send-email
   verify_jwt = false su quella function (già in config.toml).

3) Deploy Edge Functions (con _shared):
   - auth-send-email
   - create-user
   - pt-create-athlete
   - send-athlete-welcome-email
   Shared: supabase/functions/_shared/emailLayout.ts, resendMail.ts, emailCopy.ts, athleteWelcomeEmail.ts

4) Cosa deve funzionare dopo:
   - Signup PT: mail “Benvenuto, Personal Trainer” + conferma email
   - Signup atleta: mail conferma registrazione
   - Password dimenticata: mail reset sia per PT sia per atleta (testo PT se user_metadata.role=pt)
   - Admin create-user PT/atleta: mail benvenuto con password temporanea
   - PT crea atleta: mail benvenuto atleta (già esistente)

Non toccare .env frontend, client.ts, types.ts.
Riporta: secrets impostati (sì/no, senza rivelare valori), functions deployate, hook Auth attivo.
```
