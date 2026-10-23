#!/usr/bin/env node
/**
 * Best-effort: estrae INSERT/valori da export SQL Cibarius (template_recipes) → JSON Livelapp.
 * Adatta i pattern se il dump usa nomi colonne diversi.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const inPath = process.argv[2];
if (!inPath) {
  console.error('Usage: node convert_cibarius_sql.mjs <path-to-nutrition.sql>');
  process.exit(1);
}

const sql = readFileSync(inPath, 'utf8');

const CATEGORY_MAP = {
  breakfast: 'colazione',
  colazione: 'colazione',
  snack: 'spuntino',
  spuntino: 'spuntino',
  lunch: 'pranzo',
  pranzo: 'pranzo',
  dinner: 'cena',
  cena: 'cena',
  post_workout: 'post_allenamento',
  post_allenamento: 'post_allenamento',
  vegetarian: 'vegetariano',
  vegetariano: 'vegetariano',
  quick: 'veloce',
  veloce: 'veloce',
};

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function unquote(sqlFragment) {
  const t = sqlFragment.trim();
  if (t === 'NULL') return null;
  if (t.startsWith("'")) {
    return t.slice(1, -1).replace(/''/g, "'");
  }
  return t;
}

// Pattern: tuple SQL ('slug', 'cat', 'name', description, kcal, p, c, f, 'ing', 'ins', sort)
const tupleRe =
  /\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*(?:'([^']*)'|NULL)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'((?:''|[^'])*)'\s*,\s*(?:'((?:''|[^'])*)'|NULL)\s*,\s*(\d+)\s*\)/g;

const recipes = [];
let m;
while ((m = tupleRe.exec(sql)) !== null) {
  const [, slugRaw, catRaw, name, desc, kcal, p, c, f, ing, ins, sort] = m;
  const catKey = catRaw.toLowerCase().replace(/\s+/g, '_');
  const category = CATEGORY_MAP[catKey] || 'pranzo';
  recipes.push({
    slug: slugRaw || `cibarius-${slugify(name)}-${recipes.length}`,
    category,
    name,
    description: desc || 'Ricetta importata da Cibarius.',
    kcal: Number(kcal),
    protein_g: Number(p),
    carbs_g: Number(c),
    fat_g: Number(f),
    ingredients: ing.replace(/''/g, "'"),
    instructions: (ins || '').replace(/''/g, "'"),
    sort_order: Number(sort) || 1000 + recipes.length,
  });
}

if (recipes.length === 0) {
  console.error(
    'Nessuna ricetta riconosciuta. Verifica che il SQL contenga INSERT con tuple nel formato atteso, oppure esporta JSON manualmente.',
  );
  process.exit(2);
}

const outDir = join(__dirname, 'data');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'nutrition_recipes_catalog.json');
writeFileSync(outPath, JSON.stringify({ version: 1, source: 'cibarius', recipes }, null, 2));
console.error(`Importate ${recipes.length} ricette → ${outPath}`);
console.error('Ora rigenera la migration con import_cibarius_recipes.mjs');
