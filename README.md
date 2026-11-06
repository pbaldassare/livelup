# Livelapp

Piattaforma fitness per Personal Trainer e atleti (React + Vite + TypeScript + Supabase).

## Sviluppo locale

```bash
npm install
npm run dev    # Vite (porta 8080 in vite.config.ts)
npm test       # Vitest
```

Variabili: copia `.env` (o allinea `VITE_SUPABASE_*` al progetto Supabase).

## Deploy frontend

Hosting di produzione su **Cloudflare Pages**: [https://livelup.pages.dev](https://livelup.pages.dev)

Istruzioni: [`docs/DEPLOY-CLOUDFLARE.md`](docs/DEPLOY-CLOUDFLARE.md).

## Backend

Database, Auth, Storage, Realtime, Edge Functions: **Supabase** progetto `kxgaqnksylntokyrpaxp` (eu-central-1).

Migrations SQL: `supabase/migrations/`. Documentazione di contesto: `CLAUDE.md`, `CURSOR.md`.

## Repository

https://github.com/pbaldassare/elevate-roles-hub
