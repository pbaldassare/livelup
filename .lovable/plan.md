

## Piano: risoluzione definitiva 404 intermittenti

### Cause identificate (in ordine di impatto)

**1. Doppio service worker in conflitto** (causa principale)
- `public/sw.js` registrato manualmente da `usePushNotifications.tsx` per push.
- `vite-plugin-pwa` con `registerType: "autoUpdate"` registra automaticamente il SUO sw generato.
- Entrambi competono per lo scope `/`. Il primo che vince serve risorse vecchie → bundle JS stale → route nuove ritornano 404 dopo deploy.
- Inoltre: nessun guard contro iframe/preview Lovable → SW attivo anche in dev preview → cache stale dopo ogni edit.

**2. URL inesistenti hard-coded nell'app**
- `vite.config.ts` shortcut PWA: `/app/workouts` ❌ (la rotta è `/app/workout`).
- `supabase/functions/seed-platform-data/index.ts`: notifiche con `action_url: '/app/workouts'` ❌ → click notifica = 404.
- Click su notifica push da home screen → 404 su pagina inesistente.

**3. NotFound non a tema + nessun fallback intelligente**
- `NotFound.tsx` usa `bg-muted` (tema chiaro) → su dark theme appare bianco/illeggibile.
- Nessun redirect intelligente: se utente loggato finisce su `/admin/dashboard` (digitato a mano o da link vecchio), vede 404 invece di essere portato alla sua home.

**4. Telemetria 404 assente**
- Console solo `console.error` locale → non capiamo *quale* link genera il 404 (referrer mancante, no breadcrumb).

---

### Fix proposti (definitivi, niente workaround)

**Fix A — Service Worker unificato e iframe-safe**
- `vite.config.ts`: aggiungere `devOptions: { enabled: false }` e `navigateFallbackDenylist: [/^\/~oauth/, /^\/api/]`. Rimuovere lo shortcut `/app/workouts` (sostituire con `/app` neutro o `/app/esercizi` esistente).
- `src/main.tsx`: aggiungere guard che **disinstalla TUTTI i SW** quando hostname include `id-preview--` o `lovableproject.com` o quando `window.self !== window.top` (iframe). Eseguito PRIMA di `createRoot`.
- `usePushNotifications.tsx`: NON registrare più `/sw.js` separatamente. Riusare il SW di vite-plugin-pwa via `navigator.serviceWorker.ready` per il push subscription. Eliminare conflitto.
- `public/sw.js`: lo manteniamo come file ma *non viene più registrato* → niente più doppio scope. (In alternativa lo eliminiamo del tutto.)

**Fix B — URL morti fixati**
- `vite.config.ts` shortcut: `/app/workouts` → `/app/esercizi`.
- `supabase/functions/seed-platform-data/index.ts`: tutti `/app/workouts` → `/app/esercizi`.
- Migration una-tantum: `UPDATE notifications SET action_url = '/app/esercizi' WHERE action_url = '/app/workouts'` per ripulire dati esistenti.

**Fix C — NotFound intelligente + a tema**
- `NotFound.tsx`: 
  - usare `bg-background text-foreground` (rispetto tema dark/light).
  - se `isAuthenticated && role` → bottone "Vai alla tua area" che porta a `getHomeRoute(role)`.
  - logging arricchito: `pathname`, `referrer`, `userAgent`, `userId` (se loggato), `role`, `timestamp`.
  - posta i log su tabella `app_404_logs` (nuova) per analisi.

**Fix D — Tabella `app_404_logs`** (telemetria)
- Migration: `id, path, referrer, user_id (nullable), role, user_agent, created_at`.
- RLS: solo admin può leggere; insert pubblico (logging anche utenti non loggati).
- `NotFound.tsx` fa `supabase.from('app_404_logs').insert(...)` non bloccante.
- Aggiungere viewer in `AdminAuditLogPage` (o dedicato) per vedere top 404 con counts.

**Fix E — Guardia route catch-all per typo comuni**
Sopra `<Route path="*">` aggiungere redirects espliciti per pattern comuni:
```tsx
<Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
<Route path="/pt/dashboard" element={<Navigate to="/pt" replace />} />
<Route path="/app/home" element={<Navigate to="/app" replace />} />
<Route path="/app/workouts" element={<Navigate to="/app/esercizi" replace />} />
```

---

### File modificati

- `vite.config.ts` — devOptions disabled, denylist, shortcut fix
- `src/main.tsx` — iframe/preview SW unregister guard
- `src/hooks/usePushNotifications.tsx` — usa `serviceWorker.ready`, no register manuale
- `src/pages/NotFound.tsx` — tema, redirect smart, telemetria
- `src/App.tsx` — 4 redirect espliciti per typo URL
- `supabase/functions/seed-platform-data/index.ts` — `/app/workouts` → `/app/esercizi`
- **Migration nuova**: tabella `app_404_logs` + RLS + UPDATE notifications
- (Opzionale) `public/sw.js` — eliminato

### Edge case
- Utenti già con SW vecchio installato → dopo deploy il guard in `main.tsx` lo disinstalla automaticamente al primo caricamento.
- Notifiche push esistenti puntate a `/app/workouts` → migration corregge i record vecchi.
- Refresh diretto su URL valido (`/app/profile`) → SPA fallback Lovable lo gestisce già (verificato in docs).

### Checklist test
1. Refresh su `/pt/workouts` da loggato → carica, no 404 ✓
2. Click su notifica vecchia con `/app/workouts` → redirect a `/app/esercizi` ✓
3. Inserimento manuale `/admin/dashboard` → redirect a `/admin` ✓
4. URL totalmente inventato `/foo/bar` → NotFound a tema, log inserito in `app_404_logs`
5. DevTools Application → Service Workers in preview = 0 (era 1-2)
6. Logout → navigate `/auth` (no 404)
7. Admin apre log 404 → vede top URL falliti con count

