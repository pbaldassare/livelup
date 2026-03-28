

## Analisi: "Ruolo non assegnato" sulla pagina admin

### Problema
La pagina `/admin/courses` mostra "Ruolo non assegnato" nonostante l'utente sia autenticato come admin. Questo messaggio viene dal `ProtectedRoute` quando `role` è `null` — cioè la query su `user_roles` non riesce a restituire il ruolo.

### Causa probabile
Ho verificato il database: l'utente `admin@fitplatform.com` ha correttamente il ruolo `admin` in `user_roles`. Le RLS policies su `user_roles` sembrano corrette (c'è "Users can view their own roles" con `auth.uid() = user_id`).

Il problema è probabilmente una **race condition** nell'inizializzazione auth: il token JWT non è ancora pronto quando `useAuth` prova a leggere `user_roles`, e i 2 tentativi (con delay 150ms + 500ms) non bastano. Oppure la sessione del preview è scaduta/corrotta.

### Soluzione
1. **Rendere la query ruolo più resiliente** in `useAuth.tsx`:
   - Aumentare i retry da 2 a 3
   - Aggiungere un meccanismo di retry con backoff crescente
   - Loggare chiaramente l'errore per debugging

2. **Aggiungere un bottone "Riprova" nel messaggio "Ruolo non assegnato"** in `ProtectedRoute.tsx`:
   - Chiamare `refreshRole()` al click
   - Aggiungere anche un bottone "Esci" per fare logout e ri-autenticarsi

3. **Aggiungere policy di fallback SECURITY DEFINER** per la lettura del proprio ruolo — creare una funzione `get_my_role()` che bypassa RLS completamente, e usarla in `useAuth` come fallback se la query normale fallisce.

### File modificati
- **`src/hooks/useAuth.tsx`** — retry migliorato + fallback con RPC `get_my_role()`
- **`src/components/auth/ProtectedRoute.tsx`** — aggiungere bottoni "Riprova" e "Esci"
- **Migration SQL** — creare funzione `get_my_role()` SECURITY DEFINER

