# Modulo nutrizione Livelapp

## Funzionalità

- Piani PT → atleta (un piano attivo globale per atleta)
- Diario atleta, template macro, catalogo alimenti, ricette piattaforma
- Modelli piano PT, target per pasto, monitor diario PT
- Alimenti personalizzati PT (visibili agli atleti collegati in ricerca)
- Aggiunta ricetta al diario (porzioni)
- **Dispensa** atleta (`nutrition_pantry_items`) — tab Dispensa, senza ristorante
- Catalogo ricette JSON: `scripts/seed/data/nutrition_recipes_catalog.json` (~178 ricette, espandibile)

## Backend

Migrations in `supabase/migrations/20261023160000_*` … `20261023180001_*`.

## Ricerca alimenti esterna

### Opzione A — diretta dal browser

`.env` (Lovable):

```
VITE_NUTRITION_FOOD_API_URL=https://tuo-servizio
```

- `GET {base}/search?q=testo`
- `GET {base}/barcode/{ean}`

Risposta JSON (campi alias supportati): `name`, `brand`, `per_100g_kcal` (o `kcal`), `per_100g_protein_g`, …

### Opzione B — proxy Edge Function (CORS / chiavi server)

Deploy `supabase/functions/nutrition-food-proxy` e imposta secret `NUTRITION_FOOD_API_URL`.

Frontend:

```
VITE_NUTRITION_FOOD_PROXY=true
```

## Import ricette bulk (Cibarius o altro)

1. Normalizza in JSON (vedi `scripts/seed/import_cibarius_recipes.mjs`).
2. `node scripts/seed/import_cibarius_recipes.mjs data.json supabase/migrations/YYYYMMDD_import.sql`
3. Applica migration su Lovable Cloud.

Rigenera catalogo ricette (JSON + SQL):

```bash
node scripts/seed/generate_recipes_catalog.mjs
node scripts/seed/import_cibarius_recipes.mjs scripts/seed/data/nutrition_recipes_catalog.json supabase/migrations/20261023210001_nutrition_recipes_catalog.sql
```

Il file JSON è versionato nel repo: puoi modificarlo manualmente o sostituirlo con un export Cibarius normalizzato allo stesso schema.
