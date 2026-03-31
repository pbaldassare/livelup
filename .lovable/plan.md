

## Piano: Link di iscrizione PT + Coupon PT

### 3 funzionalità richieste

**1. Link di iscrizione personalizzato per ogni PT**
Ogni PT ha un link unico (es. `https://app.livellapp.com/auth?ref=PT_USER_ID`) che può condividere con i suoi clienti. Quando un atleta si registra tramite quel link, viene automaticamente creata una richiesta di collegamento con quel PT (origin = 'referral').

**2. Il PT può registrare direttamente i propri clienti**
Nella dashboard PT (pagina Atleti), un bottone "Aggiungi Atleta" apre un form dove il PT inserisce email dell'atleta. Il sistema invia un invito (o crea l'account) e collega automaticamente l'atleta al PT.

**3. Coupon/Offerte PT**
Ogni PT può creare i propri coupon (es. "1 mese gratis") dalla propria dashboard. Diverso dai coupon admin che sono globali — questi sono coupon legati al singolo PT.

---

### Modifiche tecniche

**Database (migration SQL)**
- Aggiungere colonna `referred_by_pt` (uuid, nullable, FK → profiles.user_id) alla tabella `atleta_profiles` — per tracciare quale PT ha portato l'atleta
- Aggiungere RLS policy su `coupons` per i PT: possono CRUD solo i propri coupon (`created_by = auth.uid()`)

**`src/pages/auth/AuthPage.tsx`**
- Leggere query param `ref` dall'URL
- Dopo registrazione atleta con `ref`, creare automaticamente una connection_request con origin='referral'
- Salvare `referred_by_pt` nel profilo atleta

**`src/pages/pt/PTDashboard.tsx` o `PTSettingsPage.tsx`**
- Sezione "Il tuo link di iscrizione" con URL copiabile (`/auth?mode=signup&ref={userId}`)
- Bottone copia con feedback

**`src/pages/pt/PTAthletesPage.tsx`**
- Bottone "Invita Atleta" — form con email, invia link di registrazione con ref del PT (o crea account direttamente via edge function `create-user`)

**Nuova pagina `src/pages/pt/PTCouponsPage.tsx`**
- CRUD coupon del PT (stessa struttura di AdminCouponsPage ma filtrata per `created_by = user.id`)
- Campi: codice, descrizione, tipo sconto (% o fisso), valore, scadenza, max utilizzi
- I coupon creati dal PT hanno `created_by = pt_user_id`

**`src/components/layouts/PTDashboardLayout.tsx`**
- Aggiungere voce "Coupon" nella sidebar PT con icona `Tag`

**`src/App.tsx`**
- Aggiungere rotta `/pt/coupons` protetta

### File coinvolti
- Migration SQL (colonna `referred_by_pt` + RLS coupon per PT)
- `src/pages/auth/AuthPage.tsx` (gestione param `ref`)
- `src/pages/pt/PTAthletesPage.tsx` (bottone invita + link referral)
- `src/pages/pt/PTCouponsPage.tsx` (nuova pagina CRUD coupon PT)
- `src/components/layouts/PTDashboardLayout.tsx` (voce sidebar)
- `src/App.tsx` (rotta)

