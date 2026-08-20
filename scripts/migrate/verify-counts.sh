#!/usr/bin/env bash
# Confronta il numero di righe di ogni tabella public tra sorgente e destinazione.
set -euo pipefail
cd "$(dirname "$0")"
# shellcheck disable=SC1091
source .env.migrate

SQL="select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1"
DIFFS=0

for t in $(psql "$SRC_DB_URL" -Atc "$SQL"); do
  a=$(psql "$SRC_DB_URL" -Atc "select count(*) from public.\"$t\"")
  b=$(psql "$DST_DB_URL" -Atc "select count(*) from public.\"$t\"" 2>/dev/null || echo "ERR")
  if [ "$a" != "$b" ]; then
    printf '%-42s src=%-8s dst=%-8s  ❌\n' "$t" "$a" "$b"
    DIFFS=$((DIFFS+1))
  else
    printf '%-42s %-8s ✅\n' "$t" "$a"
  fi
done

echo "---"
[ "$DIFFS" -eq 0 ] && echo "Tutte le tabelle allineate." || echo "$DIFFS tabelle disallineate."
