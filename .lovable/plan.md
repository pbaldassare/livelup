

## Piano: Fix login loop per PT

### Problema
La modifica precedente al `ProtectedRoute` (auto sign-out quando il ruolo non si risolve) ha introdotto una race condition. Dopo il login:
1. `setUser(user)` rende `isAuthenticated = true`
2. Ma `isRoleLoading` non è ancora `true` e `role` è ancora `null`
3. L'effetto di auto-signout scatta subito, disconnettendo l'utente prima che il ruolo venga caricato
4. Loop infinito: login → signout → login → signout...

### Soluzione
Aggiungere un **debounce di 3 secondi** all'effetto di auto-signout in `ProtectedRoute.tsx`. Questo dà tempo sufficiente al `useAuth` di risolvere il ruolo (che ha già i suoi retry con backoff). Solo se dopo 3 secondi il ruolo è ancora `null`, allora si fa il sign-out.

### File da modificare
**`src/components/auth/ProtectedRoute.tsx`** (linee 37-45)
- Wrappare la logica di sign-out in un `setTimeout(3000)`
- Cancellare il timeout se il ruolo viene risolto nel frattempo (cleanup dell'effect)

