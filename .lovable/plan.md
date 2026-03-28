
Obiettivo: eliminare la schermata “Ruolo non assegnato” per l’admin (ora è un falso negativo).

Diagnosi già verificata:
- Nel database l’utente admin ha ruolo corretto (`admin`).
- Le chiamate di rete a `user_roles` rispondono con `admin`.
- Quindi il problema è nel frontend auth state (parsing/ordine aggiornamenti), non nei dati.

Piano di correzione

1) Rendere deterministico il fetch ruolo in `useAuth.tsx`
- Estrarre una funzione unica `resolveRole(session)` usata ovunque.
- Prima chiamata: RPC `get_my_role()` (SECURITY DEFINER) come fonte principale.
- Fallback: query `user_roles` solo se RPC fallisce.
- Parsing robusto: gestire sia risposta oggetto sia array (evita `null` quando la risposta cambia formato).

2) Rimuovere race condition tra `onAuthStateChange` e `getSession`
- Oggi ci sono 2 flussi che possono sovrascrivere `role` a `null`.
- Unificare la logica: stesso handler, stesso retry/backoff.
- Regola anti-regressione: non sovrascrivere un ruolo valido con `null` da fetch tardivo.

3) Gestione loading più corretta per utenti autenticati
- Se utente autenticato ma ruolo in risoluzione, mostrare “Caricamento permessi” (non “Ruolo non assegnato”).
- Mostrare “Ruolo non assegnato” solo dopo esito finale negativo certo.

4) Migliorare `ProtectedRoute.tsx` per UX admin
- Mantenere “Riprova/Esci”.
- Aggiungere stato intermedio chiaro (pending permessi) per evitare pagina “senza senso” durante bootstrap.
- Nessun bypass sicurezza client-side: accesso sempre basato su ruolo backend.

5) Verifica finale end-to-end
- Login admin → `/admin` carica dashboard senza schermata errore.
- Hard refresh su `/admin`, `/admin/courses`, `/admin/settings`.
- Test “Riprova” quando rete lenta.
- Verifica che PT/Atleta non possano entrare in route admin.

File da aggiornare
- `src/hooks/useAuth.tsx` (fix principale)
- `src/components/auth/ProtectedRoute.tsx` (stato intermedio + UX)

Database
- Nessuna nuova migration necessaria (la funzione `get_my_role()` esiste già e va bene).
