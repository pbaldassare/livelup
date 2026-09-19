# Prompt Lovable — solo carica dati dal database separato

Il database di Livelapp **non è** quello interno di Lovable.
Lovable deve **solo collegarsi e caricare i dati**. Non eseguire SQL, non creare tabelle, non toccare RLS.

Database ufficiale (già aggiornato, `can_chat_with` già applicato):

- Project ref: `kxgaqnksylntokyrpaxp`
- URL: `https://kxgaqnksylntokyrpaxp.supabase.co`

---

## PROMPT DA INCOLLARE IN LOVABLE

```text
STOP. Questo progetto ha un DATABASE SEPARATO da Lovable.

Lovable NON è il database. Lovable deve SOLO collegarsi e CARICARE i dati.
NON eseguire SQL. NON applicare migration. NON creare/modificare funzioni, policy, tabelle, seed, reset.

Database ufficiale (unico):
  Project ref:  kxgaqnksylntokyrpaxp
  Nome:         Livelapp
  Region:       eu-central-1
  URL:          https://kxgaqnksylntokyrpaxp.supabase.co

Il Cloud vecchio è VIETATO:
  uiowzycolsmgcsvihmhy

COSA DEVI FARE
1) Scollega uiowzycolsmgcsvihmhy se è ancora connesso.
2) Collega kxgaqnksylntokyrpaxp come unico backend.
3) Aggiorna solo le env frontend:
   - VITE_SUPABASE_PROJECT_ID = kxgaqnksylntokyrpaxp
   - VITE_SUPABASE_URL        = https://kxgaqnksylntokyrpaxp.supabase.co
   - VITE_SUPABASE_PUBLISHABLE_KEY = la publishable/anon key di kxgaqnksylntokyrpaxp
4) Togli ogni riferimento a uiowzycolsmgcsvihmhy.
5) Publish/preview devono autenticare e leggere/scrivere SOLO su kxgaqnksylntokyrpaxp.

COSA NON DEVI FARE
- NON lanciare SQL / migration / can_chat_with / policy su chats.
- NON ricreare il database. NON seed. NON wipe. NON reset Cloud.
- NON toccare client.ts, types.ts a mano.
- NON cambiare logica UI.

PERCHÉ
"Invia un messaggio" fallisce con RLS su chats perché la preview sta ancora caricando i dati dal Cloud vecchio. Sul database separato (kxgaqnksylntokyrpaxp) la regola è GIÀ applicata. Basta che Lovable punti lì.

Conferma in chat:
- backend collegato = kxgaqnksylntokyrpaxp
- vecchio scollegato = sì
- VITE_SUPABASE_URL attuale
Non stampare service_role.
```
