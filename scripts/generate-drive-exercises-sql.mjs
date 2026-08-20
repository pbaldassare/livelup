import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lines = fs
  .readFileSync(path.join(__dirname, 'drive-exercise-files.txt'), 'utf8')
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean);

/** @type {Record<string, { muscles: string[]; equipment: string[]; difficulty: string; blurb: string }>} */
const FOLDER = {
  'Back lever': {
    muscles: ['Schiena', 'Core', 'Spalle'],
    equipment: ['Sbarra'],
    difficulty: 'avanzato',
    blurb: 'Skill di leva posteriore alla sbarra.',
  },
  'Bar muscle up': {
    muscles: ['Schiena', 'Spalle', 'Tricipiti'],
    equipment: ['Sbarra'],
    difficulty: 'avanzato',
    blurb: 'Transizione pull-up → dip alla sbarra.',
  },
  Core: {
    muscles: ['Core', 'Addominali'],
    equipment: ['Corpo libero'],
    difficulty: 'intermedio',
    blurb: 'Lavoro di core a corpo libero o sbarra.',
  },
  Dip: {
    muscles: ['Petto', 'Tricipiti', 'Spalle'],
    equipment: ['Parallele'],
    difficulty: 'intermedio',
    blurb: 'Dip su parallele, sbarra o anelli.',
  },
  'Dragon press': {
    muscles: ['Core', 'Spalle', 'Addominali'],
    equipment: ['Corpo libero'],
    difficulty: 'avanzato',
    blurb: 'Pressa a corpo libero tipo dragon press.',
  },
  'Front lever': {
    muscles: ['Schiena', 'Core', 'Spalle'],
    equipment: ['Sbarra'],
    difficulty: 'avanzato',
    blurb: 'Skill di leva anteriore alla sbarra.',
  },
  Handstand: {
    muscles: ['Spalle', 'Core', 'Trapezio'],
    equipment: ['Corpo libero'],
    difficulty: 'avanzato',
    blurb: 'Verticale e progressioni alla parete.',
  },
  Hspu: {
    muscles: ['Spalle', 'Tricipiti', 'Trapezio'],
    equipment: ['Corpo libero'],
    difficulty: 'avanzato',
    blurb: 'Piegamenti in verticale (HSPU).',
  },
  'Human flag': {
    muscles: ['Core', 'Spalle', 'Schiena'],
    equipment: ['Palo'],
    difficulty: 'avanzato',
    blurb: 'Bandiera umana su palo verticale.',
  },
  'Iron cross': {
    muscles: ['Spalle', 'Petto', 'Core'],
    equipment: ['Anelli'],
    difficulty: 'avanzato',
    blurb: 'Croce di ferro agli anelli.',
  },
  'L-sit': {
    muscles: ['Core', 'Addominali', 'Spalle'],
    equipment: ['Parallele'],
    difficulty: 'intermedio',
    blurb: 'L-sit su parallele o sbarre.',
  },
  Legs: {
    muscles: ['Quadricipiti', 'Glutei', 'Femorali'],
    equipment: ['Corpo libero'],
    difficulty: 'intermedio',
    blurb: 'Gambe a corpo libero (squat, affondi, pistol).',
  },
  Maltese: {
    muscles: ['Spalle', 'Petto', 'Core'],
    equipment: ['Anelli'],
    difficulty: 'avanzato',
    blurb: 'Maltese / lean avanzato.',
  },
  Oap: {
    muscles: ['Schiena', 'Bicipiti', 'Avambracci'],
    equipment: ['Sbarra'],
    difficulty: 'avanzato',
    blurb: 'Trazione a un braccio e progressioni (OAP/OAC).',
  },
  Planche: {
    muscles: ['Spalle', 'Petto', 'Core'],
    equipment: ['Parallele'],
    difficulty: 'avanzato',
    blurb: 'Planche e progressioni (tuck, straddle, full).',
  },
  'Pull up': {
    muscles: ['Schiena', 'Bicipiti', 'Avambracci'],
    equipment: ['Sbarra'],
    difficulty: 'intermedio',
    blurb: 'Trazioni e varianti di presa.',
  },
  'Push Up': {
    muscles: ['Petto', 'Tricipiti', 'Core'],
    equipment: ['Corpo libero'],
    difficulty: 'principiante',
    blurb: 'Piegamenti e varianti.',
  },
  'Ring muscle up': {
    muscles: ['Schiena', 'Spalle', 'Core'],
    equipment: ['Anelli'],
    difficulty: 'avanzato',
    blurb: 'Muscle-up agli anelli e false grip.',
  },
  Stretching: {
    muscles: ['Full Body'],
    equipment: ['Tappetino'],
    difficulty: 'principiante',
    blurb: 'Allungamento e mobilità.',
  },
  Ted: {
    muscles: ['Spalle', 'Petto', 'Core'],
    equipment: ['Anelli'],
    difficulty: 'avanzato',
    blurb: 'Skill TED (progressione anelli).',
  },
  'V-sit': {
    muscles: ['Core', 'Addominali'],
    equipment: ['Parallele'],
    difficulty: 'avanzato',
    blurb: 'V-sit e compressioni.',
  },
  'Victorian assisted': {
    muscles: ['Spalle', 'Petto', 'Core'],
    equipment: ['Anelli'],
    difficulty: 'avanzato',
    blurb: 'Victorian assistita agli anelli.',
  },
  'Warm-up': {
    muscles: ['Full Body'],
    equipment: ['Nessuno'],
    difficulty: 'principiante',
    blurb: 'Riscaldamento articolare e attivazione.',
  },
};

function titleCase(raw) {
  const s = raw
    .replace(/&amp;/g, '&')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const titled = s
    .toLowerCase()
    .replace(/(^|[\s\-_/])(\w)/g, (_, a, b) => a + b.toUpperCase());
  return titled
    .replace(/\bHspu\b/gi, 'HSPU')
    .replace(/\bOap\b/gi, 'OAP')
    .replace(/\bOac\b/gi, 'OAC')
    .replace(/\bTed\b/gi, 'TED')
    .replace(/\bL-sit\b/gi, 'L-sit')
    .replace(/\bV-sit\b/gi, 'V-sit');
}

function sqlStr(s) {
  return `'${s.replace(/'/g, "''")}'`;
}

function sqlArr(arr) {
  return `ARRAY[${arr.map(sqlStr).join(', ')}]`;
}

function inferDifficulty(folder, variant) {
  const v = variant.toLowerCase();
  const meta = FOLDER[folder];
  let d = meta?.difficulty || 'intermedio';
  if (/\b(knee|tuck|assisted|foot-assisted|box|wall|beginner)\b/.test(v)) d = 'principiante';
  if (/\b(eccentric|iso|straddle|one leg|advanced|decline)\b/.test(v) && d === 'principiante') {
    d = 'intermedio';
  }
  if (/\b(full|one arm|oap|oac|maltese|iron cross|flag|victorian|press)\b/.test(v)) {
    if (folder !== 'Warm-up' && folder !== 'Stretching') d = 'avanzato';
  }
  if (folder === 'Warm-up' || folder === 'Stretching') d = 'principiante';
  return d;
}

function inferEquipment(folder, variant) {
  const v = variant.toLowerCase();
  const base = [...(FOLDER[folder]?.equipment || ['Corpo libero'])];
  if (/\bring/.test(v)) return ['Anelli'];
  if (/\bparallet/.test(v) || /\bprallel/.test(v)) return ['Parallele'];
  if (/\bwall/.test(v)) return [...new Set([...base, 'Parete'])];
  return base;
}

const rows = [];
const seen = new Set();
for (const line of lines) {
  const pipe = line.indexOf('|');
  if (pipe < 0) continue;
  const folder = line.slice(0, pipe).trim();
  let filename = line.slice(pipe + 1).trim();
  if (!filename.toLowerCase().endsWith('.mp4')) continue;
  filename = filename.replace(/&amp;/g, '&');
  const base = filename.replace(/\.mp4$/i, '').trim();
  let variant = base;
  const us = base.indexOf('_');
  if (us >= 0) variant = base.slice(us + 1).trim();
  else {
    const stripped = base.replace(new RegExp(`^${folder}\\s*`, 'i'), '').trim();
    variant = stripped || folder;
  }
  variant = variant.replace(/_+$/g, '').trim();
  const name = `${folder} · ${titleCase(variant)}`;
  if (seen.has(name.toLowerCase())) continue;
  seen.add(name.toLowerCase());
  const meta = FOLDER[folder] || {
    muscles: ['Full Body'],
    equipment: ['Corpo libero'],
    difficulty: 'intermedio',
    blurb: 'Esercizio calisthenics.',
  };
  const difficulty = inferDifficulty(folder, variant);
  const equipment = inferEquipment(folder, variant);
  const description = `${meta.blurb} Variante: ${titleCase(variant)}.`;
  const instructions = `Esegui ${name} con controllo, scapole attive e core chiuso. Progressione della famiglia ${folder}. Video dimostrativo in arrivo.`;
  rows.push({ folder, name, description, instructions, difficulty, muscles: meta.muscles, equipment });
}

const inserts = rows.map((r) => {
  return `(${sqlStr(r.name)}, ${sqlStr(r.description)}, ${sqlStr(r.instructions)}, ${sqlStr(r.folder)}, ${sqlArr(r.muscles)}, ${sqlArr(r.equipment)}, ${sqlStr(r.difficulty)}::public.fitness_level, true, NULL)`;
});

const sql = `-- Archivio esercizi allineato alle cartelle Google Drive (solo metadati, no video).
-- Cartella Drive = exercises.category. Nome = "Cartella · Variante".
-- Rimuove gli esercizi pubblici non presenti su Drive. Gli esercizi privati PT restano.
-- pt_course_step_exercises ha ON DELETE RESTRICT: scollegare prima i passi corso.

-- Sblocca FK RESTRICT sui corsi
DELETE FROM public.pt_course_step_exercises cse
USING public.exercises e
WHERE cse.exercise_id = e.id AND e.is_public = true;

-- Preferiti, cataloghi, template_exercises, workout_exercises: CASCADE
-- warmup/cooldown: SET NULL
DELETE FROM public.exercises WHERE is_public = true;

INSERT INTO public.exercises (
  name, description, instructions, category, muscle_groups, equipment, difficulty_level, is_public, video_url
) VALUES
${inserts.join(',\n')};
`;

const outSql = path.join(__dirname, '..', 'supabase', 'migrations', '20260820140000_drive_calisthenics_exercise_archive.sql');
fs.writeFileSync(outSql, sql, 'utf8');

const cats = [...Object.keys(FOLDER), 'Altro'];
const ts = `/** Cartelle archivio = famiglie video Drive (senza scaricare i file). */
export const EXERCISE_ARCHIVE_CATEGORIES = ${JSON.stringify(cats, null, 2)} as const;

export type ExerciseArchiveCategory = (typeof EXERCISE_ARCHIVE_CATEGORIES)[number];
`;
fs.writeFileSync(path.join(__dirname, '..', 'src', 'lib', 'exerciseArchiveCategories.ts'), ts, 'utf8');

console.log(`Wrote ${rows.length} exercises, ${cats.length} categories -> ${outSql}`);
