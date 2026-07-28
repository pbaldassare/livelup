## Cosa ho verificato

- `vite-plugin-pwa` è attivo con `registerType: "autoUpdate"` e genera un service worker in `/sw.js`.
- Esiste anche un `public/sw.js` scritto a mano (cache + **push notifications** + `notificationclick`). In build i due file finiscono sullo stesso path: **il SW generato sovrascrive quello manuale**, quindi gli handler push rischiano di sparire dal build di produzione.
- Non esiste un modulo unico di registrazione: `injectRegister` non è impostato (il plugin inietta la sua registrazione) mentre `src/main.tsx` fa una disinstallazione ad hoc.
- La guardia in `main.tsx` disinstalla il SW su qualsiasi host che contiene `lovable.app` — che include **anche il dominio pubblicato** `elevate-roles-hub.lovable.app`: lì la PWA (offline + push) di fatto non si attiva mai.
- Manca un kill-switch `?sw=off`; il reset attuale è solo `?reset=1` in `main.tsx`.

## Cosa farò

**1. Un solo service worker, senza perdere il push**
- Sposto gli handler push/notificationclick in `public/push-sw.js` (file dedicato, non toccato dal build).
- Rimuovo `public/sw.js` manuale e lo faccio generare solo da `vite-plugin-pwa`, includendo il push via `workbox.importScripts: ['/push-sw.js']`.
- Navigazioni in `NetworkFirst` con fallback a `offline.html`; asset hashati in `CacheFirst`; `/~oauth` escluso.

**2. Registrazione guardata in un unico punto**
- Nuovo `src/lib/pwa/registerSW.ts`: registra solo in produzione e rifiuta (disinstallando eventuali SW residui) quando è in iframe, su host `id-preview--*` / `preview--*` / `*.lovableproject.com` / `*.lovableproject-dev.com` / `beta.lovable.dev`, o con `?sw=off`.
- Il dominio pubblicato (`elevate-roles-hub.lovable.app`, `livelapp.iaconnect.it`) **non** viene più escluso: lì la PWA funziona.
- `injectRegister: null` in `vite.config.ts`, così l'unico registrante è il wrapper; tolgo la logica duplicata da `main.tsx` lasciando solo `?reset=1`.

**3. Prompt di aggiornamento coerente**
- `usePWAUpdate` allineato al nuovo SW (waiting → `SKIP_WAITING` → reload una sola volta), evitando il doppio listener `controllerchange` attuale.

**4. Verifica**
- Build di produzione + controllo che `dist/sw.js`, `manifest.webmanifest`, icone e `push-sw.js` siano presenti e coerenti.
- Check con browser headless: manifest valido, nessuna registrazione SW in preview/iframe, nessun errore console su `/app` e `/pt/app`.
- Report finale con esito punto per punto.

## Nota

"Aggiorna tutto" l'ho interpretato come: allineare la PWA e verificarne il funzionamento end-to-end (build, manifest, offline, push, update prompt). Se intendevi anche un sync/apply di migration o feature specifiche non ancora applicate, dimmelo e lo aggiungo — al momento l'ultimo sync backend risultava già completo.

## Dettagli tecnici

- File nuovi: `public/push-sw.js`, `src/lib/pwa/registerSW.ts`
- File modificati: `vite.config.ts`, `src/main.tsx`, `src/hooks/usePWAUpdate.tsx`
- File rimosso: `public/sw.js` (contenuto migrato)
- Nessuna modifica a `.env`, `client.ts`, `types.ts`, `supabase/config.toml`
