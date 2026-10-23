#!/usr/bin/env node
/**
 * Genera catalogo ricette JSON (stile template Cibarius, senza dipendenze esterne).
 * Output: scripts/seed/data/nutrition_recipes_catalog.json
 * Poi: node scripts/seed/import_cibarius_recipes.mjs scripts/seed/data/nutrition_recipes_catalog.json supabase/migrations/20261023210001_nutrition_recipes_catalog.sql
 */
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, 'data');
mkdirSync(outDir, { recursive: true });

function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const TEMPLATES = {
  colazione: [
    { name: 'Porridge {p} e frutta', ing: '80g fiocchi avena\n200ml {m}\n1 {f}\n10g mandorle', ins: 'Cuoci l\'avena 5 min con il liquido. Aggiungi frutta e mandorle.', kcal: 410, p: 18, c: 58, f: 12 },
    { name: 'Toast {t} e uova', ing: '60g pane integrale\n2 uova\n{t}\nSale/pepe', ins: 'Tosta il pane. Prepara uova come preferisci.', kcal: 360, p: 22, c: 32, f: 16 },
    { name: 'Yogurt bowl {f}', ing: '200g yogurt greco 0%\n40g avena\n{f}\n5g miele', ins: 'Mescola in ciotola.', kcal: 320, p: 26, c: 42, f: 5 },
    { name: 'Smoothie {f}', ing: '250ml latte o vegetale\n1 scoop whey\n{f}\nGhiaccio', ins: 'Frulla tutto.', kcal: 290, p: 32, c: 28, f: 4 },
    { name: 'Frittata {v}', ing: '3 uova\n150g {v}\n5g olio EVO', ins: 'Salta le verdure, aggiungi uova.', kcal: 340, p: 24, c: 6, f: 24 },
  ],
  spuntino: [
    { name: 'Mix {n}', ing: '30g {n}\n1 frutto a scelta', ins: 'Porzione singola.', kcal: 210, p: 8, c: 22, f: 11 },
    { name: 'Crackers e {p}', ing: '4 gallette riso\n80g {p}', ins: 'Assembla.', kcal: 190, p: 18, c: 20, f: 4 },
    { name: 'Shake rapido {f}', ing: '200ml latte\n1 {f}\n15g burro arachidi', ins: 'Frulla.', kcal: 280, p: 16, c: 30, f: 10 },
  ],
  pranzo: [
    { name: '{p} con {c} e verdure', ing: '150g {p}\n80g {c} crudo\n200g verdure\n10g olio', ins: 'Cuoci carboidrato. Proteina a piacere. Condisci verdure.', kcal: 520, p: 42, c: 55, f: 12 },
    { name: 'Pasta {s} e {p}', ing: '80g pasta\n150g {p}\n{s}\n5g olio', ins: 'Cuoci pasta al dente. Condisci.', kcal: 490, p: 35, c: 62, f: 10 },
    { name: 'Bowl {l} mediterranea', ing: '120g {l}\n100g verdure\n50g feta o mozzarella light\n10g olio', ins: 'Mescola tutto.', kcal: 460, p: 24, c: 52, f: 16 },
    { name: 'Insalata di {p}', ing: '180g {p}\nVerdure miste\n50g mais o quinoa\n10g olio e limone', ins: 'Taglia e condisci.', kcal: 380, p: 38, c: 28, f: 14 },
  ],
  cena: [
    { name: '{p} al forno e insalata', ing: '160g {p}\nInsalata abbondante\n10g olio', ins: 'Forno 180°C 20 min.', kcal: 400, p: 40, c: 12, f: 18 },
    { name: 'Zuppa {l} e pane', ing: '200g {l}\n40g pane integrale\nSpezie', ins: 'Scalda legumi, servi con pane.', kcal: 420, p: 22, c: 58, f: 8 },
    { name: 'Pesce {f} e verdure', ing: '180g {f}\n300g verdure al vapore\n5g olio', ins: 'Cuoci pesce e verdure.', kcal: 370, p: 36, c: 18, f: 14 },
    { name: 'Uova e {v}', ing: '2 uova\n250g {v}\n5g olio', ins: 'Saltato veloce.', kcal: 310, p: 20, c: 14, f: 20 },
  ],
  post_allenamento: [
    { name: 'Recovery {c} + {p}', ing: '70g {c}\n120g {p}\nSale', ins: 'Consuma entro 60 min.', kcal: 450, p: 38, c: 55, f: 6 },
    { name: 'Shake {f}', ing: '1 {f}\nWhey\n300ml acqua', ins: 'Frulla subito post workout.', kcal: 300, p: 34, c: 35, f: 3 },
  ],
  vegetariano: [
    { name: 'Curry {l}', ing: '150g {l}\n80g riso\nCurry e verdure', ins: 'Saltato 15 min.', kcal: 430, p: 20, c: 60, f: 10 },
    { name: 'Tofu {s} e verdure', ing: '150g tofu\nVerdure miste\n{s}\n5g olio', ins: 'Marina tofu, salta in padella.', kcal: 400, p: 26, c: 32, f: 18 },
    { name: 'Pasta e {l}', ing: '80g pasta integrale\n120g {l}\nPomodoro', ins: 'Condisci la pasta.', kcal: 470, p: 22, c: 68, f: 10 },
  ],
  veloce: [
    { name: 'Panino {p}', ing: '80g pane\n100g {p}\nVerdure', ins: 'Assembla.', kcal: 390, p: 30, c: 42, f: 10 },
    { name: 'Piadina {p}', ing: '1 piadina integrale\n80g {p}\nRucola', ins: 'Scalda e riempi.', kcal: 420, p: 28, c: 40, f: 14 },
    { name: 'Riso veloce {p}', ing: 'Riso pronto 150g\n100g {p}\nSalsa soia', ins: 'Mescola in 5 min.', kcal: 440, p: 32, c: 52, f: 8 },
  ],
};

const FILL = {
  p: ['petto di pollo', 'tacchino', 'tonno', 'salmone', 'uova', 'bresaola', 'whey', 'seitan', 'tempeh'],
  m: ['latte scremato', 'latte di mandorla', 'latte di avena'],
  f: ['banana', 'mela', 'frutti di bosco', 'kiwi', 'pera'],
  t: ['avocado', 'hummus', 'ricotta', 'salmon affumicato'],
  v: ['spinaci', 'zucchine', 'broccoli', 'peperoni'],
  c: ['riso basmati', 'riso integrale', 'pasta', 'patate', 'quinoa', 'orzo'],
  s: ['pomodorini', 'pesto leggero', 'salsa di soia', 'limone e erbe'],
  l: ['ceci', 'lenticchie', 'fagioli', 'edamame'],
  n: ['mandorle', 'noci', 'nocciole', 'mix semi'],
};

function expandCategory(category, templates, limit) {
  const out = [];
  let i = 0;
  for (const tpl of templates) {
    const keys = [
      ...tpl.name.matchAll(/\{(\w+)\}/g),
      ...tpl.ing.matchAll(/\{(\w+)\}/g),
    ].map((m) => m[1]);
    const uniqueKeys = [...new Set(keys)];
    const rounds = uniqueKeys.length ? 8 : 1;
    for (let r = 0; r < rounds && out.length < limit; r++) {
      const pick = {};
      for (const k of uniqueKeys) {
        const opts = FILL[k] || ['extra'];
        pick[k] = opts[(i + r) % opts.length];
      }
      i++;
      const name = tpl.name.replace(/\{(\w+)\}/g, (_, k) => pick[k] || k);
      const ingredients = tpl.ing.replace(/\{(\w+)\}/g, (_, k) => pick[k] || k);
      const slug = `cat-${category}-${slugify(name)}-${i}`;
      const jitter = (i % 5) * 15 - 30;
      out.push({
        slug,
        category,
        name,
        description: 'Ricetta fitness dal catalogo Livelapp.',
        kcal: tpl.kcal + jitter,
        protein_g: tpl.p + (i % 3),
        carbs_g: tpl.c + (i % 4),
        fat_g: tpl.f + (i % 2),
        ingredients,
        instructions: tpl.ins,
        sort_order: 200 + out.length,
      });
    }
  }
  return out;
}

const recipes = [];
for (const [cat, tpls] of Object.entries(TEMPLATES)) {
  recipes.push(...expandCategory(cat, tpls, cat === 'colazione' ? 40 : 25));
}

// dedupe slug
const seen = new Set();
const unique = recipes.filter((r) => {
  if (seen.has(r.slug)) return false;
  seen.add(r.slug);
  return true;
});

const jsonPath = join(outDir, 'nutrition_recipes_catalog.json');
writeFileSync(jsonPath, JSON.stringify({ version: 1, recipes: unique }, null, 2));
console.log(`Wrote ${unique.length} recipes to ${jsonPath}`);
