

## Diagnosi

Il login ha successo (confermato dai log auth: status 200, utente `atleta2@fitplatform.com` con ruolo `atleta` presente nel database). Il problema è nel flusso post-login:

1. `handleLogin` imposta `isLoading = true` e dopo il login riuscito **non lo resetta mai** — si affida al redirect via `useEffect`
2. Il redirect scatta solo quando `isAuthenticated && role` sono entrambi truthy
3. Se `fetchUserRole` fallisce o va in timeout (es. il token auth non è ancora pronto per le query RLS nel callback `onAuthStateChange`), `role` resta `null` → il redirect non scatta mai → spinner infinito

Questo è un problema noto: dentro `onAuthStateChange`, il client Supabase potrebbe non aver ancora impostato il token JWT per le query RLS, causando il fallimento silenzioso della query `user_roles`.

## Piano di fix

### 1. Defer del fetch ruolo in `useAuth.tsx`
Nel callback `onAuthStateChange`, aggiungere un piccolo `setTimeout` (100ms) prima di chiamare `fetchUserRole`, per dare tempo al client di impostare il token. Aggiungere anche un meccanismo di retry (1 tentativo aggiuntivo) se il ruolo torna `null` per un utente autenticato.

### 2. Safety timeout in `AuthPage.tsx`
Nel `handleLogin`, aggiungere un timeout di sicurezza (es. 10 secondi) che:
- Resetta `isLoading = false`
- Mostra un toast di errore con possibilità di riprovare
- Evita che l'utente resti bloccato sullo spinner infinito

### 3. Gestione esplicita di "login ok ma ruolo null"
Nell'`useEffect` di redirect in AuthPage, aggiungere un controllo: se `isAuthenticated` è true ma `role` è null e `authLoading` è false, mostrare un messaggio/toast e resettare il loading locale.

### Sezione tecnica

**File modificati:**
- `src/hooks/useAuth.tsx` — defer + retry del fetch ruolo in `onAuthStateChange`
- `src/pages/auth/AuthPage.tsx` — safety timeout nel login + gestione caso "autenticato senza ruolo"

**Nessuna modifica backend necessaria** — il ruolo esiste correttamente nel database.

