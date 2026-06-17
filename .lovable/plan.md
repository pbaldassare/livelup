# PT App nativa — non più dashboard adattata

## Cosa cambia per l'utente

Oggi un PT che apre il sito da telefono (o dalla PWA installata) vede la **dashboard web** ridotta in larghezza: header desktop, KPI a torta, sidebar nascosta. Non è un'app, è un sito stretto.

Dopo questo intervento:

- Da telefono (`< 768px`) o quando la PWA è in modalità **standalone**, qualsiasi rotta `/pt/*` reindirizza automaticamente alla shell mobile `/pt/app/*`.
- Da desktop la dashboard web resta identica: nessuna regressione per chi lavora al PC.
- La shell `/pt/app` viene completata con tutte le funzioni che oggi esistono solo sul web (Esercizi, Template, Coupons, Pagamenti, Blog, Impostazioni), così il PT può davvero lavorare dal telefono.

```text
┌─────────────────────┐         ┌─────────────────────┐
│  Desktop (≥ 768px)  │         │  Mobile / PWA       │
│   /pt  → web        │         │   /pt  → /pt/app    │
│   PTDashboardLayout │         │   AppLayout (PWA)   │
└─────────────────────┘         └─────────────────────┘
```

## Intervento 1 — Redirect intelligente /pt → /pt/app

Nuovo componente `PTSurfaceRouter` montato a livello di rotta su tutte le pagine `/pt/*` (web), che decide dove far atterrare il PT:

- Mobile o PWA installata → `Navigate` su `/pt/app{stessa-sezione}` (es. `/pt/calendar` → `/pt/app/calendar`).
- Desktop browser → mostra la dashboard web normale.

Trigger di detezione (riusando `useInstallPrompt` e media query esistenti):

- `window.matchMedia('(display-mode: standalone)').matches` → PWA installata.
- `window.matchMedia('(max-width: 767px)').matches` → mobile.
- Override manuale con query `?view=web` per debug da telefono (utile per supporto).

Il redirect è **client-side** dopo l'idratazione dell'auth (non server-side: la rotta web non sparisce, semplicemente non viene mostrata su mobile).

## Intervento 2 — Parità feature PWA PT

Aggiungo alla bottom-nav di `AppLayout` (variante PT) un sesto ingresso "Altro" che apre un drawer con le sezioni avanzate, mantenendo i 5 slot principali ergonomici:

- **Bottom-nav (5)**: Home · Atleti · Schede · Chat · Altro
- **Drawer "Altro"**: Calendario · Esercizi · Template · Coupons · Pagamenti · Blog · Impostazioni · Profilo · Logout

Nuove pagine mobile (wrapper sottili sui componenti già usati nel web, adattati a viewport 390px):

- `PTAppExercisesPage` → riusa `PTExercisesArchivePage`
- `PTAppTemplatesPage` → riusa la lista template in `PTWorkoutsPage`
- `PTAppCouponsPage` → riusa `PTCouponsPage`
- `PTAppPaymentsPage` → riusa `PTPaymentsPage`
- `PTAppBlogPage` → riusa `PTBlogPage`
- `PTAppSettingsPage` → riusa `PTSettingsPage`

Tutte registrate sotto `/pt/app/*` e protette dal solito `ProtectedRoute role="pt"`.

## Intervento 3 — Identità visiva mobile PT

La PWA PT deve sembrare un'app, non la dashboard teal stretta. Riuso il design system mobile esistente (`AppLayout` con `data-role="pt"`) e:

- Header mobile dedicato (logo, notifiche, avatar) — non l'header web.
- Card e liste a piena larghezza, no tabelle desktop.
- Stesso pattern visivo dell'Atleta PWA ma con accent PT (teal `#0d4f4f` invece di lime).
- Splash + transizioni Framer Motion già attive in `AppLayout`.

## Dettagli tecnici

- **Nessuna modifica al manifest**: `scope:"/"` resta valido, copre sia `/app` che `/pt/app`.
- **Service worker invariato**: la cache è role-agnostic, è il router a portare l'utente nella shell corretta.
- **Nessuna modifica RLS / backend**: le pagine PWA usano gli stessi endpoint Supabase già protetti per il ruolo `pt`.
- **InstallBanner**: rimane gated come ora (Atleta su `/app`, PT su `/pt/app`).
- **Memoria progetto aggiornata**: nuova memory `mem://features/pt-pwa-shell` che documenta il redirect e la parità feature.

## File toccati

Nuovi:
- `src/components/auth/PTSurfaceRouter.tsx` — wrapper di redirect
- `src/pages/pt/PTAppExercisesPage.tsx`
- `src/pages/pt/PTAppTemplatesPage.tsx`
- `src/pages/pt/PTAppCouponsPage.tsx`
- `src/pages/pt/PTAppPaymentsPage.tsx`
- `src/pages/pt/PTAppBlogPage.tsx`
- `src/pages/pt/PTAppSettingsPage.tsx`
- `src/components/app/PTMoreDrawer.tsx`

Modificati:
- `src/App.tsx` — avvolge tutte le rotte `/pt/*` (web) in `PTSurfaceRouter`, registra le nuove rotte `/pt/app/*`
- `src/components/layouts/AppLayout.tsx` — bottom-nav PT con voce "Altro" + drawer
- `mem://index.md` + nuovo file memory

## Fuori scope

- Nessuna riscrittura della dashboard web PT (resta intatta per desktop).
- Nessun cambio al flusso Atleta.
- Nessuna nuova feature business: è una riorganizzazione di superficie.
