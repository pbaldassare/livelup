# Ricette Cibarius → Livelapp

**Fonte ufficiale:** `cibarius-ricette.json` (480 ricette, piani digiuno/dimagrimento/keto/massa/mediterranea).

## Rigenerare catalogo + migration SQL

```bash
node scripts/seed/convert_cibarius_json.mjs scripts/seed/cibarius/cibarius-ricette.json
node scripts/seed/import_cibarius_recipes.mjs scripts/seed/data/nutrition_recipes_catalog.json supabase/migrations/20261023210001_nutrition_recipes_catalog.sql
```

Applica su Lovable Cloud (dopo `20261023220000_nutrition_recipes_diet_plan.sql`):

- `20261023220000_nutrition_recipes_diet_plan.sql` — colonne `diet_plan`, `prep_time_min`
- `20261023210001_nutrition_recipes_catalog.sql` — DELETE catalogo piattaforma + INSERT 480 ricette

## Export SQL legacy

Se ricevi solo `.sql`: `node scripts/seed/convert_cibarius_sql.mjs path/to/nutrition.sql`
