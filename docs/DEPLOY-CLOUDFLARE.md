# Deploy frontend su Cloudflare Pages

L’app React (Vite) è un sito statico: il build produce `dist/`. Il backend resta **Supabase** (`kxgaqnksylntokyrpaxp`).

## Produzione nota nel repo

- **URL Pages:** https://livelup.pages.dev

## Build su Cloudflare Pages

1. Connetti il repo GitHub al progetto Pages.
2. **Build command:** `npm run build`
3. **Build output directory:** `dist`

   Il repo contiene **`package-lock.json`** e **`bun.lock`**. Molti ambienti (incluso il rilevamento automatico di package manager) scelgono **Bun** se trovano `bun.lock`: aggiorna **entrambi** i lockfile quando cambi le dipendenze (`npm install` + `bun install`), oppure usa un solo lockfile e rimuovi l’altro dal repo.

4. **Node.js:** il repo include **`.nvmrc`** (`20`). Su Cloudflare Pages imposta anche la variabile **`NODE_VERSION=20`** (Build environment) se il picker non legge `.nvmrc`.

5. **`npm install` in produzione:** se Pages usa **`npm install --omit=dev`**, **Vite** e la toolchain di build sono in **`dependencies`** (vedi `package.json`).

6. **Memoria:** il comando `build` imposta `--max-old-space-size=4096` (4 GiB). Non alzarlo a 8192 sull’CI: Pages ha ~8 GiB di RAM **per tutto** il processo di build; un heap Node da 8 GiB può far fallire il deploy (“build exceeded memory limit”).

   Se in **Environment variables** del progetto Pages è impostato `NODE_OPTIONS=--max-old-space-size=8192`, **rimuovilo** o allinealo a `4096`: le due impostazioni si sommano al rischio di superare il limite.

7. **Variabili d’ambiente** (stesso set del `.env` locale, con prefisso `VITE_`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
   - (opzionali nutrizione, mappe, ecc. come in `.env`)

**Routing SPA:** senza un `404.html` in cima al sito, [Cloudflare Pages assume un’app a pagina singola](https://developers.cloudflare.com/pages/configuration/serving-pages/#single-page-application-spa-rendering) e per i path che non corrispondono a file statici serve la root (`/`), così React Router può gestire le route. Non servono `_redirects` né middleware solo per questo.

## Supabase Auth

In **Supabase Dashboard → Authentication → URL configuration**:

- **Site URL:** `https://livelup.pages.dev` (e/o il dominio custom)
- **Redirect URLs:** includi `https://livelup.pages.dev/**`, `https://livelapp.iaconnect.it/**`, localhost per sviluppo

## Dominio custom

Aggiungi il dominio su Cloudflare Pages e allinea gli stessi URL in Supabase Auth.
