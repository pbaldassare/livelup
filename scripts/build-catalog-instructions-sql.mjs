/**
 * Generates the catalog instructions UPDATE migration from src/lib/exerciseInstructions.ts
 * Usage: node --experimental-strip-types scripts/build-catalog-instructions-sql.mjs
 * (or: npx tsx scripts/build-catalog-instructions-sql.mts)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalogInstructions } from '../src/lib/exerciseInstructions.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rows = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalog-exercise-names.json'), 'utf8'));

function sqlName(s) {
  return `'${s.replace(/'/g, "''")}'`;
}

function sqlInstr(s) {
  if (s.includes('$instr$')) throw new Error('delimiter clash');
  return `$instr$${s}$instr$`;
}

const values = rows
  .map((r) => `  (${sqlName(r.name)}, ${sqlInstr(buildCatalogInstructions(r.name, r.category))})`)
  .join(',\n');

const sql = `-- Tecnica catalogo Drive: due righe vere, toglie «Video dimostrativo in arrivo».
-- Solo esercizi pubblici con MP4 in storage. Non tocca testi custom dei PT.

UPDATE public.exercises AS e
SET instructions = v.instructions
FROM (
  VALUES
${values}
) AS v(name, instructions)
WHERE e.is_public = true
  AND e.name = v.name
  AND (
    e.video_url ILIKE '%exercise-videos%'
    OR e.instructions ILIKE '%Video dimostrativo in arrivo%'
  )
  AND (
    e.instructions ILIKE '%Video dimostrativo in arrivo%'
    OR e.instructions ILIKE '%scapole attive e core chiuso%'
  );
`;

const out = path.join(__dirname, '..', 'supabase', 'migrations', '20260919190000_catalog_mp4_instructions.sql');
fs.writeFileSync(out, sql, 'utf8');
console.log(`Wrote ${rows.length} updates -> ${out}`);
