#!/usr/bin/env node
/**
 * Converte cibarius-ricette.json → nutrition_recipes_catalog.json (schema Livelapp)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const inPath = process.argv[2] || join(__dirname, 'cibarius/cibarius-ricette.json');
const outPath =
  process.argv[3] || join(__dirname, 'data/nutrition_recipes_catalog.json');

const raw = JSON.parse(readFileSync(inPath, 'utf8'));
const list = raw.recipes || [];

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);
}

const MEAL_MAP = {
  colazione: 'colazione',
  spuntino: 'spuntino',
  pranzo: 'pranzo',
  cena: 'cena',
};

const recipes = list.map((r, i) => {
  const category = MEAL_MAP[r.meal_type] || 'pranzo';
  const slug = `cib-${slugify(r.diet_category)}-${slugify(r.meal_type)}-${slugify(r.title)}-${i + 1}`;
  const ingredients = (r.ingredients || [])
    .map((ing) => {
      const g = ing.grams != null ? ` ${ing.grams}g` : '';
      return `- ${ing.name}${g}`;
    })
    .join('\n');

  const dietLabel = {
    digiuno: 'Digiuno intermittente',
    dimagrimento: 'Dimagrimento',
    keto: 'Cheto',
    massa: 'Massa',
    mediterranea: 'Mediterranea',
  }[r.diet_category] || r.diet_category;

  let description = `Piano: ${dietLabel}.`;
  if (r.prep_time_min) description += ` Tempo: ${r.prep_time_min} min.`;
  if (r.portion_scale_female && r.portion_scale_female !== 1) {
    description += ` Porzione donna ≈ ${Math.round(r.portion_scale_female * 100)}%.`;
  }

  return {
    slug,
    category,
    diet_plan: r.diet_category,
    name: r.title,
    description,
    kcal: Math.round(Number(r.kcal_total) || 0),
    protein_g: Math.round(Number(r.protein_total) || 0),
    carbs_g: Math.round(Number(r.carbs_total) || 0),
    fat_g: Math.round(Number(r.fats_total) || 0),
    prep_time_min: r.prep_time_min ?? null,
    ingredients: ingredients || '—',
    instructions:
      r.instructions?.trim() ||
      'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.',
    sort_order: 300 + i,
  };
});

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(
  outPath,
  JSON.stringify(
    {
      version: 1,
      source: 'cibarius-ricette.json',
      recipe_count: recipes.length,
      recipes,
    },
    null,
    2,
  ),
);
console.error(`Convertite ${recipes.length} ricette → ${outPath}`);
