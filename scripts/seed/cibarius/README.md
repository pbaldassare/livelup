# Import ricette Cibarius → Livelapp

Quando hai l’export (zip o `nutrition.sql`):

1. Estrai il file SQL o esporta le righe `template_recipes` in JSON.
2. Metti il file qui, es. `scripts/seed/cibarius/nutrition.sql` (non committare dati sensibili se non serve).
3. Esegui:

```bash
node scripts/seed/convert_cibarius_sql.mjs scripts/seed/cibarius/nutrition.sql
node scripts/seed/import_cibarius_recipes.mjs scripts/seed/data/nutrition_recipes_catalog.json supabase/migrations/20261023210001_nutrition_recipes_catalog.sql
```

Il convertitore mappa le categorie Cibarius alle categorie Livelapp (`colazione`, `spuntino`, `pranzo`, `cena`, `post_allenamento`, `vegetariano`, `veloce`).

Finché non arriva il file ufficiale, il catalogo temporaneo resta in `scripts/seed/data/nutrition_recipes_catalog.json`.
