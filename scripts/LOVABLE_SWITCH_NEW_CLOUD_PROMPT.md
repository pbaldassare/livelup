# Prompt Lovable — passa al nuovo backend e stacca il vecchio

Incolla questo nella chat del progetto Lovable **Livelapp** (app `05f7b58c-39e8-4ba3-a7bf-bd051bc56040`).

```text
STOP. Cambio backend definitivo. Leggi tutto prima di toccare qualsiasi file.

DA ORA IN POI l'unico Cloud / database di Livelapp è QUESTO:

  Project ref:     kxgaqnksylntokyrpaxp
  Nome:            Livelapp
  Region:          eu-central-1
  URL:             https://kxgaqnksylntokyrpaxp.supabase.co

Il Cloud VECCHIO è MORTO per questo repo. Non usarlo più, non scriverci, non riallacciarlo:

  VECCHIO (VIETATO):  uiowzycolsmgcsvihmhy

COSA DEVI FARE ADESSO (solo switch di connessione)

1) Scollega / disconnect il Cloud vecchio (uiowzycolsmgcsvihmhy) da QUESTO progetto Lovable.
2) Collega / connect il Cloud NUOVO kxgaqnksylntokyrpaxp come backend ufficiale dell'app.
3) Aggiorna le env del frontend in modo che TUTTE puntino SOLO al nuovo:
   - VITE_SUPABASE_PROJECT_ID = kxgaqnksylntokyrpaxp
   - VITE_SUPABASE_URL        = https://kxgaqnksylntokyrpaxp.supabase.co
   - VITE_SUPABASE_PUBLISHABLE_KEY = la publishable/anon KEY del progetto NUOVO
   Togli ogni riferimento a uiowzycolsmgcsvihmhy da .env, config, commenti operativi, hook Auth, redirect, Edge secrets.
4) Da ora: migration, Edge Functions, secrets, Auth (Site URL, redirect, hook Send Email), Storage = SOLO kxgaqnksylntokyrpaxp.
5) Conferma in chat, con prove:
   - Cloud collegato = kxgaqnksylntokyrpaxp
   - Cloud vecchio scollegato = sì
   - VITE_SUPABASE_PROJECT_ID attuale
   - VITE_SUPABASE_URL attuale
   Non stampare service_role.

COSA NON DEVI FARE (vietato)

- NON ricreare il database. NON lanciare seed. NON wipe. NON "reset Cloud".
- NON riapplicare le migration da zero: schema, dati, Auth (34 utenti) e Storage (45 file) sono GIÀ sul nuovo.
- NON copiare dati dal vecchio al nuovo. La migrazione è già finita.
- NON riallacciare uiowzycolsmgcsvihmhy "per sicurezza" o "in parallelo".
- NON modificare src/integrations/supabase/client.ts o types.ts a mano se non per allinearli al nuovo Cloud già collegato.
- NON cambiare logica UI / routing / RLS.
- NON inventare un terzo progetto Cloud.

Dopo lo switch: publish/preview devono autenticare e leggere dati da kxgaqnksylntokyrpaxp. Se qualcosa punta ancora a uiowzycolsmgcsvihmhy, è un bug: correggilo.

Rispondi SOLO con: connesso / scollegato / env aggiornate / eventuale residuo del vecchio ref.
```
