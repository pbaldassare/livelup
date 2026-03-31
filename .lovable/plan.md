
Problema individuato: `pt2@fitplatform.com` ha già il ruolo corretto (`pt`) in `user_roles`, quindi il ruolo “sbagliato” non è nel routing. Il vero guasto è doppio:

1. `pt2@fitplatform.com` e anche `pt3@fitplatform.com` non hanno una riga in `pt_profiles`
2. il seed dei PT è rotto: in `supabase/functions/seed-test-users/index.ts` usa `level: 'mid'`, ma il tipo valido di `pt_profiles.level` non prevede `mid`, quindi l’inserimento del profilo PT fallisce

In più c’è una fragilità nel login:
- `useAuth.tsx` può esporre per un attimo `isAuthenticated=true` con `role=null` mentre il ruolo si sta ancora risolvendo
- questo fa partire toast/errori o logout prematuri invece di aspettare il caricamento completo

Piano di fix

1. Correggere subito i dati utenti bloccati
- creare i `pt_profiles` mancanti per `pt2@fitplatform.com` e `pt3@fitplatform.com`
- impostare campi minimi validi e `status='attivo'`
- usare un `level` valido del sistema, non `mid`
- così i PT tornano coerenti con la loro tipologia utente e possono entrare nella dashboard PT

2. Correggere il seed dei PT
- in `supabase/functions/seed-test-users/index.ts` sostituire i valori `level: 'mid'` con un enum valido
- evitare che nuovi PT seeded vengano creati con `user_roles` ma senza `pt_profiles`

3. Rendere robusto il caricamento ruolo nel login
- in `src/hooks/useAuth.tsx` forzare lo stato di loading quando arriva una nuova sessione autenticata
- non lasciare la UI in stato “autenticato ma senza ruolo” prima che i retry sul ruolo siano finiti
- resettare in modo pulito lo stato quando cambia sessione utente

4. Eliminare i falsi errori nella pagina auth
- in `src/pages/auth/AuthPage.tsx` non mostrare “Errore nel caricamento del ruolo” finché la risoluzione del ruolo non è davvero conclusa
- allineare il redirect solo dopo ruolo risolto:
  - admin → `/admin`
  - pt → `/pt`
  - atleta → `/app`

5. Tenere coerente il fallback delle route protette
- in `src/components/auth/ProtectedRoute.tsx` mantenere il recupero automatico solo come estrema protezione
- evitare sign-out anticipati mentre `useAuth` sta ancora finendo il resolve del ruolo

File coinvolti
- `supabase/functions/seed-test-users/index.ts`
- fix dati backend per `pt2@fitplatform.com` e `pt3@fitplatform.com`
- `src/hooks/useAuth.tsx`
- `src/pages/auth/AuthPage.tsx`
- `src/components/auth/ProtectedRoute.tsx`

Risultato atteso
- `pt2@fitplatform.com / Trainer123!` entra correttamente come PT
- ogni utente viene reindirizzato in base alla sua tipologia reale
- niente più errore fittizio di ruolo o loop login/logout durante l’accesso
