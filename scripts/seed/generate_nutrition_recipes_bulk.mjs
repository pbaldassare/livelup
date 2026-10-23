/**
 * Genera migration SQL con ricette aggiuntive (stile catalogo template).
 * Uso: node scripts/seed/generate_nutrition_recipes_bulk.mjs > supabase/migrations/20261023180001_nutrition_recipes_bulk_seed.sql
 */
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE = [
  { cat: 'colazione', names: ['Pancake proteici', 'Toast uovo e salmone', 'Smoothie verde', 'Crema di riso e cacao', 'Cottage e frutta', 'Frittata spinaci', 'Budino chia', 'Pane e burro arachidi'] },
  { cat: 'spuntino', names: ['Barretta casalinga', 'Yogurt e noci', 'Crackers e bresaola', 'Frullato latte e banana', 'Mix frutta secca', 'Gallette riso e tonno', 'Prosciutto e melone', 'Shake cioccolato'] },
  { cat: 'pranzo', names: ['Orzo verdure e feta', 'Insalata di quinoa', 'Wrap pollo', 'Zuppa legumi', 'Salmone e cous cous', 'Petto anatra e verdure', 'Riso venere e tofu', 'Pizza integrale margherita fit', 'Lasagne zucchine', 'Hamburger vitello'] },
  { cat: 'cena', names: ['Merluzzo al forno', 'Polpo e patate', 'Vitello tonnato light', 'Zucca ripiena', 'Pesce spada griglia', 'Pollo curry leggero', 'Minestrone e pane', 'Uova in purè', 'Branzino al cartoccio', 'Straccetti manzo'] },
  { cat: 'post_allenamento', names: ['Riso e pollo', 'Patate dolci e tacchino', 'Pane e marmellata', 'Cioccolato e frutta', 'Smoothie recovery'] },
  { cat: 'vegetariano', names: ['Buddha bowl', 'Pasta ceci e rosmarino', 'Falafel e hummus', 'Risotto zucca', 'Tempeh saltato', 'Polpette lenticchie', 'Pizza veg', 'Gnocchi zucca'] },
  { cat: 'veloce', names: ['Tramezzino tonno', 'Piadina prosciutto', 'Riso e uovo', 'Noodles verdure', 'Insalata tonno', 'Mozzarella e pomodoro', 'Shake veloce', 'Wrap uovo'] },
];

function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function macrosForCategory(cat) {
  const m = {
    colazione: [380, 22, 42, 14],
    spuntino: [200, 10, 22, 8],
    pranzo: [500, 35, 55, 14],
    cena: [420, 32, 35, 16],
    post_allenamento: [320, 28, 40, 6],
    vegetariano: [440, 18, 58, 14],
    veloce: [360, 24, 38, 12],
  };
  return m[cat] ?? [400, 25, 45, 12];
}

const rows = [];
let sort = 100;
for (const { cat, names } of BASE) {
  for (const name of names) {
    const slug = `bulk-${cat}-${slugify(name)}`;
    const [kcal, p, c, f] = macrosForCategory(cat);
    const jitter = (n, d) => Math.max(1, n + (rows.length % 5) - 2) * (n > 50 ? 1 : 1) + (d ?? 0);
    const k = kcal + (rows.length % 7) * 8 - 24;
    rows.push({
      slug,
      cat,
      name,
      kcal: k,
      p: p + (rows.length % 3),
      c: c + (rows.length % 4),
      f: f + (rows.length % 2),
      sort: sort++,
    });
  }
}

const esc = (s) => s.replace(/'/g, "''");

const values = rows
  .map(
    (r) =>
      `  ('${esc(r.slug)}', '${r.cat}', '${esc(r.name)}', 'Idea pasto dal catalogo Livelapp.', ${r.kcal}, ${r.p}, ${r.c}, ${r.f}, 'Ingredienti a scelta del Professionista\\nVerdure, proteine e carboidrati in base al piano.', 'Prepara seguendo le porzioni del tuo piano.', ${r.sort})`,
  )
  .join(',\n');

const sql = `-- Seed ricette bulk (${rows.length} voci) — generato da scripts/seed/generate_nutrition_recipes_bulk.mjs
INSERT INTO public.nutrition_template_recipes (
  slug, category, name, description, per_serving_kcal, per_serving_protein_g,
  per_serving_carbs_g, per_serving_fat_g, ingredients, instructions, sort_order
)
VALUES
${values}
ON CONFLICT (slug) DO NOTHING;
`;

const out = join(__dirname, '../../supabase/migrations/20261023180001_nutrition_recipes_bulk_seed.sql');
writeFileSync(out, sql);
console.log(`Wrote ${rows.length} recipes to ${out}`);
