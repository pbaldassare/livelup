

## Piano: Rimuovere la schermata "Ruolo non assegnato"

### Problema
Quando il ruolo non viene risolto (per qualsiasi motivo), l'utente vede una pagina morta "Ruolo non assegnato" che non è utile e blocca l'esperienza.

### Soluzione
Sostituire la schermata con un **sign-out automatico + redirect a /auth** con un toast di errore. Se il ruolo non si risolve dopo i retry, l'utente viene disconnesso e riportato al login — dove può riprovare.

### Modifiche

**`src/components/auth/ProtectedRoute.tsx`** (linee 67-93)
- Rimuovere l'intero blocco UI "Ruolo non assegnato" (div con titolo, messaggio, bottoni Riprova/Esci)
- Sostituirlo con: `useEffect` che fa sign-out automatico quando `!role && !isRoleLoading` e redirect a `/auth`
- Mostrare il `LoadingSpinner` durante il sign-out
- Aggiungere un `toast.error` per informare l'utente di riprovare il login

### Risultato
Nessuna pagina morta. Se il ruolo non viene trovato → logout automatico → pagina login.

