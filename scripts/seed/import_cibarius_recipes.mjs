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
    return `  ('${slug}', '${cat}', '${esc(r.name)}', '${esc(r.description || '')}', ${Number(r.kcal) || 400}, ${Number(r.protein_g) || 0}, ${Number(r.carbs_g) || 0}, ${Number(r.fat_g) || 0}, '${esc(r.ingredients || '—')}', '${esc(r.instructions || '')}', ${Number(r.sort_order) || 1000 + i})`;
  })
  .join(',\n');

const sql = `INSERT INTO public.nutrition_template_recipes (
  slug, category, name, description, per_serving_kcal, per_serving_protein_g,
  per_serving_carbs_g, per_serving_fat_g, ingredients, instructions, sort_order
)
VALUES
${values}
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  per_serving_kcal = EXCLUDED.per_serving_kcal,
  per_serving_protein_g = EXCLUDED.per_serving_protein_g,
  per_serving_carbs_g = EXCLUDED.per_serving_carbs_g,
  per_serving_fat_g = EXCLUDED.per_serving_fat_g,
  ingredients = EXCLUDED.ingredients,
  instructions = EXCLUDED.instructions;
`;

if (outPath) writeFileSync(outPath, sql);
else process.stdout.write(sql);

console.error(`Prepared ${list.length} recipes.`);
