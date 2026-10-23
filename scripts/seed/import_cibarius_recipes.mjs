#!/usr/bin/env node
/**
 * Import ricette da JSON (es. export Cibarius normalizzato) → SQL INSERT.
 *
 * Formato atteso array JSON:
 * [{ "slug": "...", "category": "pranzo", "name": "...", "kcal": 500, "protein_g": 30,
 *    "carbs_g": 50, "fat_g": 12, "ingredients": "...", "instructions": "..." }]
 *
 * Uso:
 *   node scripts/seed/import_cibarius_recipes.mjs ./data/recipes.json > out.sql
 */
import { readFileSync, writeFileSync } from 'fs';

const inPath = process.argv[2];
if (!inPath) {
  console.error('Usage: node import_cibarius_recipes.mjs <recipes.json> [out.sql]');
  process.exit(1);
}

const outPath = process.argv[3];
const raw = JSON.parse(readFileSync(inPath, 'utf8'));
const list = Array.isArray(raw) ? raw : raw.recipes ?? [];

const allowed = new Set([
  'colazione',
  'spuntino',
  'pranzo',
  'cena',
  'post_allenamento',
  'vegetariano',
  'veloce',
]);

const esc = (s) => String(s ?? '').replace(/'/g, "''");

const values = list
  .map((r, i) => {
    const cat = allowed.has(r.category) ? r.category : 'pranzo';
    const slug = esc(r.slug || `import-${i}-${esc(r.name).slice(0, 40)}`);
    const kcal = Number(r.kcal ?? r.per_serving_kcal) || 400;
    const pg = Number(r.protein_g ?? r.per_serving_protein_g) || 0;
    const cg = Number(r.carbs_g ?? r.per_serving_carbs_g) || 0;
    const fg = Number(r.fat_g ?? r.per_serving_fat_g) || 0;
    const diet = r.diet_plan ? `'${esc(r.diet_plan)}'` : 'NULL';
    const prep = r.prep_time_min != null ? Number(r.prep_time_min) : 'NULL';
    return `  ('${slug}', '${cat}', '${esc(r.name)}', '${esc(r.description || '')}', ${kcal}, ${pg}, ${cg}, ${fg}, '${esc(r.ingredients || '—')}', '${esc(r.instructions || '')}', ${Number(r.sort_order) || 1000 + i}, ${diet}, ${prep})`;
  })
  .join(',\n');

const sql = `-- Sostituisce il catalogo piattaforma (import Cibarius)
DELETE FROM public.nutrition_template_recipes WHERE is_platform = true;

INSERT INTO public.nutrition_template_recipes (
  slug, category, name, description, per_serving_kcal, per_serving_protein_g,
  per_serving_carbs_g, per_serving_fat_g, ingredients, instructions, sort_order,
  diet_plan, prep_time_min
)
VALUES
${values}
ON CONFLICT (slug) DO UPDATE SET
  category = EXCLUDED.category,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  per_serving_kcal = EXCLUDED.per_serving_kcal,
  per_serving_protein_g = EXCLUDED.per_serving_protein_g,
  per_serving_carbs_g = EXCLUDED.per_serving_carbs_g,
  per_serving_fat_g = EXCLUDED.per_serving_fat_g,
  ingredients = EXCLUDED.ingredients,
  instructions = EXCLUDED.instructions,
  sort_order = EXCLUDED.sort_order,
  diet_plan = EXCLUDED.diet_plan,
  prep_time_min = EXCLUDED.prep_time_min;
`;

if (outPath) writeFileSync(outPath, sql);
else process.stdout.write(sql);

console.error(`Prepared ${list.length} recipes.`);
