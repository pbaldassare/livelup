## Piano

1. **Stabilizzare `useAuth`**
   - Inizializzare la sessione in modo esplicito con `getSession()` all’avvio, invece di dipendere solo dagli eventi `INITIAL_SESSION`.
   - Evitare che il timeout di sicurezza metta `isLoading=false` mentre ruolo/sessione sono ancora in risoluzione.
   - Mantenere utente/sessione/ruolo coerenti durante `TOKEN_REFRESHED` e navigazioni rapide.

2. **Rimuovere il logout automatico aggressivo da `ProtectedRoute`**
   - Non fare più `supabase.auth.signOut()` se il ruolo è temporaneamente `null`.
   - Mostrare “Caricamento permessi...” finché auth/ruolo sono in corso.
   - Solo dopo un errore reale o assenza sessione, reindirizzare a `/auth` senza forzare logout.

3. **Evitare redirect transitori alla login**
   - Usare il ruolo già risolto come fallback durante refresh token/cambio pagina.
   - Se l’utente è autenticato ma il ruolo tarda, non mandarlo alla login.

4. **Verifica**
   - Controllare console e richieste auth dopo cambio pagina su `/pt` e una pagina interna PT.
   - Verificare che non compaiano più “Sessione non valida” o redirect/logout automatici durante la navigazione.