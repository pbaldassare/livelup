---
name: PT PWA Shell
description: Dedicated mobile PWA experience for PTs at /pt/app, with auto-redirect from /pt on mobile/standalone and full feature parity
type: feature
---
# PT PWA Shell — /pt/app

## Surface gate
- `usePTSurface()` (in `src/hooks/usePTSurface.tsx`) decides `web` vs `app`:
  - `app` if viewport ≤767px OR `display-mode: standalone` OR iOS standalone.
  - `web` otherwise.
  - Override with `?view=web` (or `?view=app`) for support sessions.
- `PTDashboardLayout` runs this gate after the onboarding gate; on `app` surface it `<Navigate>`s to `mapPTWebToApp(pathname)` (e.g. `/pt/calendar/eventi` → `/pt/app/calendar`).
- Desktop dashboard remains untouched.

## Routes (`/pt/app/*`)
Existing: `''`, `athletes`, `workouts`, `chat`, `chat/:atletaId`, `calendar`, `profile`.
Added for parity: `exercises`, `templates`, `coupons`, `payments`, `blog`, `settings` — all thin wrappers that re-render the corresponding `PT*Page` web components inside a mobile-safe container.

## Navigation
`AppLayout` PT-variant bottom-nav: Home · Atleti · Schede · Chat · **Più**.
"Più" opens `PTMoreDrawer` (bottom sheet) grouping the rest:
- Lavoro: Calendario · Esercizi · Template
- Business: Coupons · Pagamenti · Blog
- Account: Profilo · Impostazioni · Esci

## Why
A shrunk web dashboard is not an app. PT users on phones or with the PWA installed must land in a native-feeling mobile shell, not in the desktop layout squashed under 400px.
