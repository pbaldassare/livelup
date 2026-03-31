

## Piano: Riscrittura semplificata di useAuth.tsx

### Problema reale
Il codice di `useAuth.tsx` è troppo complesso: doppio handling (onAuthStateChange + getSession), retry con backoff, closures stale, e ref tracking multipli. Il risultato è che dopo il login, `handleSession` non completa mai la risoluzione del ruolo e il 12s safety timeout scatta.

I dati nel DB sono corretti: `pt2@fitplatform.com` ha ruolo `pt`, la RPC `get_my_role` (SECURITY DEFINER) funziona.

### Soluzione: semplificazione radicale
Riscrivere il cuore di `useAuth.tsx` eliminando tutta la complessità inutile:

**`src/hooks/useAuth.tsx`**:
- Rimuovere `handleSession` callback separato
- Rimuovere il pattern `getSession()` + `onAuthStateChange` doppio → usare SOLO `onAuthStateChange` (che include già `INITIAL_SESSION`)
- Rimuovere i retry con backoff (i dati esistono, una chiamata basta)
- Rimuovere `initialSessionHandled`, `roleResolvedRef`, delay di 100ms
- Gestire tutto inline nel listener:
  - `SIGNED_OUT` o no user → reset tutto, `isLoading=false`
  - `TOKEN_REFRESHED` con ruolo già presente → skip, `isLoading=false`
  - Altrimenti → `setIsRoleLoading(true)`, `setTimeout(0)` per dare tempo al client di avere il token, poi una singola chiamata a `resolveRole`, set result, `isLoading=false`
- Mantenere `roleRef` solo per il check "già risolto" su TOKEN_REFRESHED
- Safety timeout ridotto a 8s

### File coinvolti
- `src/hooks/useAuth.tsx` — riscrittura della sezione init auth

### Risultato
Login diretto, zero complessità, zero stale closures. `pt2@fitplatform.com / Trainer123!` entra.

