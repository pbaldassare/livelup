## Obiettivo

Sostituire ovunque il naming visibile con il brand corretto **LIVEL APP** (con spazio, tutto maiuscolo). Solo cleanup branding: nessuna logica toccata, nessun refactor.

## Audit completato

Trovate **27 occorrenze** del nome errato `LIVELLAPP` / `Livellapp` da correggere in 17 file. Nessuna occorrenza di `Level App`, `LevelUp App`, `Livell App` o varianti separate.

## Cosa NON cambierò (per non rompere niente)

- Nomi file asset: `livellapp-logo.svg`, `livellapp-icon.svg` (rinominarli romperebbe import/cache; restano come ID tecnico interno).
- Chiavi `localStorage`: `livellapp_tour_done`, `livellapp_tour_dismissed`, `livellapp_ref_pt` (cambiarle resetta sessioni utente esistenti).
- Cache name service worker `livellapp-v2` (ID tecnico invisibile).
- Email seed `@fitplatform.com` (sono utenti di test interni, non brand visibile).
- SVG dei loghi: contengono solo grafica, nessun testo da modificare.
- Parole italiane "livello/livelli" (significato diverso).

## File da modificare (testo brand visibile)

**Metadata / SEO / PWA (3 file)**
- `index.html` — title, description, author, apple-mobile-web-app-title, application-name, og:title, twitter:site (`@livelapp`), twitter:title
- `vite.config.ts` — manifest `name: "LIVEL APP - Piattaforma Fitness"`, `short_name: "LIVEL"`
- `public/offline.html` — title + alt logo

**Branding UI (8 file)**
- `src/components/common/Logo.tsx` — alt
- `src/components/common/SplashScreen.tsx` — testo splash
- `src/components/layouts/AdminLayout.tsx` — sidebar
- `src/components/layouts/PTDashboardLayout.tsx` — sidebar
- `src/components/layouts/PublicLayout.tsx` — header + footer copyright
- `src/components/pwa/InstallBanner.tsx` — alt + titolo "Installa LIVEL APP"
- `src/components/pwa/PWAUpdatePrompt.tsx` — testo update
- `src/hooks/usePWAUpdate.tsx` — descrizione toast

**Auth + pagine (4 file)**
- `src/pages/auth/AuthPage.tsx` — titolo h1
- `src/pages/public/LandingPage.tsx` — 3 occorrenze nei testi marketing
- `src/pages/public/InstallPage.tsx` — 2 occorrenze
- `src/pages/atleta/AtletaHelpPage.tsx` — testo FAQ

**Tour onboarding (2 file)**
- `src/components/AppTourContext.tsx` — 3 testi "Benvenuto su Livellapp" → "LIVEL APP"
- `src/components/AppTourPrompt.tsx` — titolo dialog

**Tecnico (2 file)**
- `src/main.tsx` — prefisso log `[LIVEL APP]`
- `src/index.css` — 3 commenti CSS

## Regole applicate

- Brand visibile sempre: `LIVEL APP`
- Manifest `short_name`: `LIVEL` (vincolo PWA: max 12 char senza spazio consigliato per home screen)
- Twitter handle: `@livelapp` (gli @ non possono contenere spazi)
- Console log prefix: `[LIVEL APP]`

## Check finali

Dopo l'applicazione eseguirò un grep per verificare zero occorrenze residue di `LIVELLAPP`/`Livellapp` nei testi visibili.