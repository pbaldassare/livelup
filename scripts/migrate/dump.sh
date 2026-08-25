#!/usr/bin/env bash
# Dump del progetto Supabase SORGENTE (schema public + dati + auth).
# Uso: bash scripts/migrate/dump.sh
set -euo pipefail

cd "$(dirname "$0")"
[ -f .env.migrate ] || { echo "Manca scripts/migrate/.env.migrate (vedi docs/MIGRAZIONE-SUPABASE-ESTERNO.md)"; exit 1; }
# shellcheck disable=SC1091
source .env.migrate

OUT="backup"
mkdir -p "$OUT"

echo "==> 1/3 Schema public (tabelle, tipi, funzioni, trigger, policy, grant)"
pg_dump "$SRC_DB_URL" \
  --schema=public \
  --schema-only \
  --no-owner \
  --quote-all-identifiers \
  -f "$OUT/schema.sql"

echo "==> 2/3 Dati public"
pg_dump "$SRC_DB_URL" \
  --schema=public \
  --data-only \
  --disable-triggers \
  --no-owner \
  --quote-all-identifiers \
  -f "$OUT/data.sql"

echo "==> 3/3 Utenti auth (users + identities)"
pg_dump "$SRC_DB_URL" \
  --data-only \
  --table=auth.users \
  --table=auth.identities \
  --no-owner \
  --quote-all-identifiers \
  -f "$OUT/auth.sql"

echo "Fatto. File in scripts/migrate/$OUT/:"
ls -lh "$OUT"
