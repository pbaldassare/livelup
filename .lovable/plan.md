## Problemi rilevati

Analizzando codice + screenshot:

1. **404 su `/pt/app/athlete/:id/workouts` e `/pt/app/athlete/:id`** — `PTAppAthletesPage` linka a `athlete` (singolare) ma in `App.tsx` non esistono route `/pt/app/athlete/*`, esiste solo `/pt/app/athletes` (lista). Anche `/pt/app/templates/:id`, `/pt/app/messages` e i sotto-path del calendario (`eventi`/`appuntamenti`) non sono registrati.
2. **Pagamenti / Coupons / Settings / Esercizi / Blog sovrapposti** — i wrapper `PTApp*Page` riusano 1:1 i componenti web e li avvolgono solo in `<div className="pb-4 px-2 pt-2">`. Risultato:
   - Il titolo della pagina finisce sotto la status-bar PWA (manca `safe-top`).
   - Pulsanti azione (`Esporta CSV`) escono fuori dallo schermo a destra.
   - Tabelle (`DataTable`) e tab desktop sforano in larghezza creando overflow orizzontale (l'unico `overflow-x-hidden` è in `PTDashboardLayout`, non in `AppLayout`).
   - Il drawer "Più" copre senza dare contesto perché il contenuto sottostante non ha padding-top sicuro.
3. **`AppLayout` PT manca header mobile** — atterri direttamente sul contenuto, niente titolo di pagina, niente notifiche, niente avatar; ogni pagina si arrangia.
4. **`mapPTWebToApp`** non copre l'incoerenza singolare/plurale per il detail atleta (link interni usano `/pt/app/athlete/:id`, l'hook mappa `/pt/athletes/:id` → `/pt/app/athletes/:id`).

## Cambiamenti

### 1. Routing PT-PWA — coprire tutte le destinazioni

In `src/App.tsx` aggiungere, dentro il blocco `/pt/app/*`:

- `/pt/app/athlete/:atletaId` → `PTAthleteDetailPage` (riuso pagina web — è già responsive: usa `useParams<{atletaId}>`).
- `/pt/app/athlete/:atletaId/workouts` → `PTAthleteDetailPage` con `?tab=workouts` (oppure la stessa pagina che già mostra le schede).
- `/pt/app/templates/:templateId` → `PTTemplateDetailPage`.
- `/pt/app/messages` → redirect a `/pt/app/chat` (alias legacy).
- `/pt/app/calendar/eventi` e `/pt/app/calendar/appuntamenti` → `PTAppCalendarPage` con prop `mode` (oppure usa query param interno).
- Aggiornare `mapPTWebToApp` in `src/hooks/usePTSurface.tsx` per mappare anche `/pt/athletes/:id` → `/pt/app/athlete/:id` (singolare, coerente con i link esistenti) e `/pt/calendar/eventi|appuntamenti` ai nuovi path completi.
- Aggiornare il file di test `src/hooks/__tests__/usePTSurface.test.tsx` con i nuovi mapping attesi.

### 2. Shell mobile uniforme per le pagine PT-PWA

Creare `src/components/app/PTAppPageShell.tsx`:

- Header sticky compatto con titolo + descrizione + slot `actions`, `safe-top` e `bg-app-background/95 backdrop-blur` (stesso pattern di `PTAppAthletesPage`).
- Container `px-4 pb-24` (lascia spazio per la bottom-nav fissa, 16+nav) e `min-h-0`.
- Wrapper interno `overflow-x-hidden` per impedire spillover di tabelle.

Refactor dei wrapper esistenti (NON delle pagine web) per usare il nuovo shell:

- `PTAppPaymentsPage`, `PTAppCouponsPage`, `PTAppBlogPage`, `PTAppSettingsPage`, `PTAppExercisesPage`, `PTAppTemplatesPage` passano da `<div className="pb-4 px-2 pt-2">{<PT*Page />}</div>` a `<PTAppPageShell title=… description=…>{<PT*Page />}</PTAppPageShell>`.
- Dove la pagina web rende già un `PageHeader` proprio, nasconderlo via prop `hideInnerHeader` (oppure usare un wrapper CSS che nasconde il primo `h1`); preferibilmente accettiamo il duplicato come trade-off momentaneo e nascondiamo il `PageHeader` interno tramite classe `data-pt-app` sul container che applica `[&_.pt-page-header]:hidden` — meno invasivo: i `PT*Page` web ricevono una prop opzionale `embedded?: boolean` (default false) che, se true, salta il `PageHeader` interno e disattiva eventuali container max-width fissi.

### 3. `AppLayout` PT — header mobile + scroll sicuro

In `src/components/layouts/AppLayout.tsx`:

- Aggiungere `overflow-x-hidden` al container root per evitare che tabelle/grafici sforino.
- Il `<main>` resta `pb-20 safe-top` ma diventa `min-h-0 overflow-x-hidden`.
- Nessuna modifica al lato Atleta.

### 4. Memoria

Aggiornare `.lovable/memory/features/pt-pwa-shell.md`:

- Elenco completo delle route `/pt/app/*` (con `athlete/:id`, `athlete/:id/workouts`, `templates/:id`, `messages` alias, `calendar/eventi|appuntamenti`).
- Regola: ogni wrapper PT-app DEVE usare `PTAppPageShell`; le pagine web riusate accettano `embedded` per saltare il `PageHeader`.

## Fuori scope

- Nessuna riscrittura completa di `PTPaymentsPage`/`PTCouponsPage` in cards-only — si limita all'integrazione nello shell mobile + horizontal-scroll dove serve.
- Nessuna modifica al dashboard web o all'esperienza Atleta.
- Nessuna modifica al manifest/service worker.

## File toccati

- **Creati**: `src/components/app/PTAppPageShell.tsx`.
- **Modificati**: `src/App.tsx`, `src/components/layouts/AppLayout.tsx`, `src/hooks/usePTSurface.tsx`, `src/hooks/__tests__/usePTSurface.test.tsx`, i 6 wrapper `src/pages/pt/PTApp{Payments,Coupons,Blog,Settings,Exercises,Templates}Page.tsx`, le pagine web `PTPaymentsPage`, `PTCouponsPage`, `PTBlogPage`, `PTSettingsPage`, `PTExercisesArchivePage`, `PTWorkoutsPage` (aggiunta prop opzionale `embedded`), `.lovable/memory/features/pt-pwa-shell.md`.

## Verifica

- `vitest run src/hooks/__tests__/usePTSurface.test.tsx` deve restare verde con i mapping aggiornati.
- Smoke navigazione manuale: dalla lista atleti → "Schede" non deve dare 404; `/pt/app/payments` mostra titolo + Esporta CSV visibili senza overflow orizzontale; il drawer "Più" apre le sezioni e ogni link atterra su una pagina con header coerente.
