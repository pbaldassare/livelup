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

https://github.com/pbaldassare/livelup

### Fork: allineamento automatico con `main` upstream

GitHub **non** aggiorna i fork da soli. Per tenere il tuo fork allineato al repo principale:

1. Copia **`docs/github-workflows/sync-fork-with-upstream.yml`** in **`.github/workflows/sync-fork-with-upstream.yml`** sul fork (stesso nome file).
2. Sul fork: **Settings → Actions → General → Workflow permissions** → **Read and write** (serve per fare `git push` con `GITHUB_TOKEN`).
3. Opzionale: modifica `UPSTREAM_REPO` nel workflow se l’upstream non è `pbaldassare/livelup`.

Lo workflow gira **solo sui fork** (`if: repository.fork`), una volta al giorno + da **Actions → Run workflow**. Se il merge va in conflitto, il job fallisce: risolvi a mano e rilancia.
