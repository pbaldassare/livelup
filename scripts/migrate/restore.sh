#!/usr/bin/env bash
# Ripristino sul progetto Supabase DESTINAZIONE.
# Ordine: schema public -> utenti auth -> dati public.
# Uso: bash scripts/migrate/restore.sh [--data-only]
set -euo pipefail

cd "$(dirname "$0")"
[ -f .env.migrate ] || { echo "Manca scripts/migrate/.env.migrate"; exit 1; }
# shellcheck disable=SC1091
source .env.migrate

OUT="backup"
DATA_ONLY="${1:-}"

psql_dst() { psql "$DST_DB_URL" -v ON_ERROR_STOP=1 "$@"; }

echo "==> Estensioni"
psql_dst -c 'create extension if not exists "pgcrypto";' \
         -c 'create extension if not exists "uuid-ossp";' \
         -c 'create extension if not exists "pg_trgm";'

if [ "$DATA_ONLY" != "--data-only" ]; then
  echo "==> Schema public"
  psql_dst -f "$OUT/schema.sql"
fi

echo "==> Utenti auth (trigger disattivati per non duplicare i profili)"
psql_dst -c 'alter table auth.users disable trigger all;'
psql_dst -f "$OUT/auth.sql"
psql_dst -c 'alter table auth.users enable trigger all;'

echo "==> Dati public"
psql_dst -f "$OUT/data.sql"

echo "==> Realtime publication"
for t in messages notifications pt_atleta_connections group_messages event_comments; do
  psql_dst -c "alter publication supabase_realtime add table public.$t;" || true
done

echo "==> Sanity check"
psql_dst -c "select count(*) as tabelle from information_schema.tables where table_schema='public' and table_type='BASE TABLE';"
psql_dst -c "select count(*) as policy from pg_policies where schemaname='public';"
psql_dst -c "select count(*) as utenti from auth.users;"
echo "Fatto."
