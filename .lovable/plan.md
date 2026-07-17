## Situazione

- Il repo `origin` (Lovable Git) è **allineato** al codice del progetto: ultimo commit `a59e156 "Aggiunta sezione Rapide"`, nessun commit locale/remoto in disallineamento.
- Lovable ↔ GitHub è sync bidirezionale, quindi in teoria `github.com/pbaldassare/elevate-roles-hub` deve coincidere con `origin/main`.
- **Non ho accesso** al repo GitHub da questo ambiente: `https://api.github.com/repos/pbaldassare/elevate-roles-hub` risponde `404` (repo privato o path diverso). Senza accesso non posso confrontare file per file.

## Piano

1. **Attivare il connector GitHub** (`standard_connectors--connect` → `github`) usando il tuo Personal Access Token con scope `repo`. Serve solo la prima volta; è la via ufficiale per farmi leggere il repo.
2. **Confronto automatico**: elenco i commit su GitHub `main` più recenti di `a59e156`; per ognuno estraggo i file modificati e li confronto con quelli nel progetto (`git diff` logico file-per-file).
3. **Report allineamento**: per ogni differenza riporto `PRESENTE / MANCANTE / DIVERSO` con path preciso (pagine, componenti, hook, migration, edge function).
4. **Applicazione fix** (in build mode, dopo la tua conferma sul report):
   - Riporto le modifiche mancanti dal GitHub nel progetto (file frontend/edge functions).
   - Se ci sono migration SQL nuove, le applico con `supabase--migration`.
   - Ridispiego eventuali Edge Function toccate.
5. **Verifica finale**: typecheck + visita rapida della pagina in cui pensavi mancasse la feature (`/pt/app/athlete/:id`) per confermare.

## Alternativa senza connector

Se preferisci non connettere GitHub, indicami **una** delle seguenti e procedo lo stesso:
- rendi temporaneamente pubblico il repo, oppure
- incolla l'URL del file/commit GitHub specifico che vedi mancare, oppure
- descrivi la funzione (dove sta nell'UI, cosa fa) così la cerco nel codice attuale.

## Dettagli tecnici

- Il file `src/integrations/supabase/client.ts`, `types.ts`, `.env`, `supabase/config.toml` restano intoccati (auto-generati).
- Ogni tabella nuova ⇒ GRANT + RLS + policy nella stessa migration.
- Le Edge Function toccate vengono redeployate.
