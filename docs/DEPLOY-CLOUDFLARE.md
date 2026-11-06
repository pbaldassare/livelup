# Deploy frontend su Cloudflare Pages

L’app React (Vite) è un sito statico: il build produce `dist/`. Il backend resta **Supabase** (`kxgaqnksylntokyrpaxp`).

## Produzione nota nel repo

- **URL Pages:** https://livelup.pages.dev

## Build su Cloudflare Pages

1. Connetti il repo GitHub al progetto Pages.
2. **Build command:** `npm run build`
3. **Build output directory:** `dist`
4. **Variabili d’ambiente** (stesso set del `.env` locale, con prefisso `VITE_`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
   - (opzionali nutrizione, mappe, ecc. come in `.env`)

Il file `public/_redirects` con `/* → /index.html` serve le route SPA su Pages.

## Supabase Auth

In **Supabase Dashboard → Authentication → URL configuration**:

- **Site URL:** `https://livelup.pages.dev` (e/o il dominio custom)
- **Redirect URLs:** includi `https://livelup.pages.dev/**`, `https://livelapp.iaconnect.it/**`, localhost per sviluppo

## Dominio custom

Aggiungi il dominio su Cloudflare Pages e allinea gli stessi URL in Supabase Auth.
