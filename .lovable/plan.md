
Obiettivo: risolvere la schermata bianca su mobile/PWA rendendo il bootstrap dell’app “fail-safe” anche con cache corrotta o storage non disponibile.

1) Diagnosi mirata (prima modifica)
- Verifico i punti già toccati (tour + PWA) e aggiungo logging minimo solo nei punti critici di avvio.
- Confermo due cause più probabili emerse dal codice:
  - cache/service worker in stato incoerente dopo aggiornamenti;
  - accessi diretti a `localStorage` senza guardie (tour/install), che su alcuni contesti mobile possono rompere il render.

2) Hardening storage (fix crash)
- Creo utility `safeStorageGet/safeStorageSet/safeStorageRemove` con `try/catch` e fallback.
- Sostituisco tutti gli accessi diretti in:
  - `src/hooks/useInstallPrompt.tsx`
  - `src/components/AppTourPrompt.tsx`
  - `src/components/AppTourContext.tsx`
- Obiettivo: nessun crash anche se lo storage è bloccato/corrotto.

3) Recovery PWA/cache (fix schermata bianca persistente)
- Aggiorno `public/sw.js` con versione cache nuova + pulizia robusta cache legacy.
- Aggiungo canale messaggi SW (`RESET_APP`) per:
  - cancellare tutte le cache app;
  - forzare `skipWaiting` e `clients.claim`.
- Inserisco una routine client di recovery che, su errore bootstrap o parametro `?reset=1`, fa:
  - unregister di tutti i service worker;
  - clear cache storage;
  - hard reload.

4) Fallback UI di emergenza
- Aggiungo un fallback minimale in avvio (errore runtime) con pulsante “Ripristina app” che lancia la recovery automatica.
- Così l’utente non resta mai su schermo bianco senza azione.

5) Verifica finale (mobile first)
- Test su URL pubblicato in mobile browser e PWA installata:
  - primo avvio, riavvio, aggiornamento app, recovery forzata.
- Verifico tour (`?`): overlay, spotlight, auto-advance, chiusura/riapertura, senza regressioni.

Sezione tecnica (sintesi)
- File principali coinvolti: `public/sw.js`, `src/hooks/useInstallPrompt.tsx`, `src/components/AppTourPrompt.tsx`, `src/components/AppTourContext.tsx`, `src/main.tsx` (o boundary globale in App).
- Nessuna modifica backend necessaria: problema lato bootstrap client + PWA lifecycle.
- Strategia: prevenire crash + dare sempre un percorso di autoripristino locale.
