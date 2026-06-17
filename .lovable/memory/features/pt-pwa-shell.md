---
name: PT PWA Shell
description: Dedicated mobile PWA experience for PTs at /pt/app, with auto-redirect from /pt on mobile/standalone and full feature parity
type: feature
---
# PT PWA Shell — /pt/app

## Surface gate
- `usePTSurface()` (in `src/hooks/usePTSurface.tsx`) → `app` if narrow viewport, `display-mode: standalone`, or iOS standalone. Override `?view=web|app`.
- `PTDashboardLayout` redirects to `mapPTWebToApp(pathname)` on `app` surface.
- `mapPTWebToApp`: `/pt/athletes/:id` → `/pt/app/athlete/:id` (SINGOLARE — i link interni del PT-PWA usano la forma singolare per il detail).

## Routes (`/pt/app/*`)
Core: `''`, `athletes`, `athlete/:id`, `athlete/:id/workouts`, `workouts`, `templates`, `templates/:id`, `chat`, `chat/:atletaId`, `calendar`, `profile`.
Parità con la dashboard web: `exercises`, `coupons`, `payments`, `blog`, `settings`.
Alias: `messages` → `chat`, `calendar/eventi|appuntamenti` → `calendar`.

## Page shell
Ogni wrapper PT-app DEVE usare `PTAppPageShell` (`src/components/app/PTAppPageShell.tsx`):
- header sticky compatto con `safe-top` e backdrop blur,
- container `px-3 pb-24 overflow-x-hidden` (rispetta bottom-nav + safe area).

Le pagine web riusate (`PTPaymentsPage`, `PTCouponsPage`, `PTBlogPage`, `PTSettingsPage`, `PTExercisesArchivePage`, `PTWorkoutsPage`) accettano la prop opzionale `embedded?: boolean`: quando `true` saltano il proprio `PageHeader`/`DashboardPageHeader` (titolo già reso dalla shell) e mostrano solo l'azione principale compatta.

## Navigation
Bottom-nav: Home · Atleti · Schede · Chat · **Più** (apre `PTMoreDrawer`):
- Lavoro: Calendario · Esercizi · Template
- Business: Coupons · Pagamenti · Blog
- Account: Profilo · Impostazioni · Esci

## Why
Una dashboard web rimpicciolita non è un'app. PT su smartphone o con PWA installata atterrano sulla shell mobile dedicata; le pagine condivise non duplicano header desktop e non sforano in larghezza.
