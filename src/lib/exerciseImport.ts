import * as XLSX from 'xlsx';
import {
  EXERCISE_ARCHIVE_CATEGORIES,
  EXERCISE_DIFFICULTY_LEVELS,
  EXERCISE_MUSCLE_GROUPS,
} from '@/lib/exerciseArchiveCategories';

export const EXERCISE_IMPORT_COLUMNS = [
  'nome',
  'categoria',
  'muscoli',
  'difficolta',
  'video_url',
  'descrizione',
  'istruzioni',
  'catalogo_pt',
] as const;

export type ExerciseImportRow = {
  line: number;
  nome: string;
  categoria: string;
  muscoli: string[];
  difficolta: (typeof EXERCISE_DIFFICULTY_LEVELS)[number];
  video_url: string | null;
  descrizione: string | null;
  istruzioni: string | null;
  catalogo_pt: string | null;
};

export type ExerciseImportIssue = { line: number; message: string };

const CATEGORY_BY_LOWER = new Map(
  EXERCISE_ARCHIVE_CATEGORIES.map((c) => [c.toLowerCase(), c]),
);
const MUSCLE_BY_LOWER = new Map(EXERCISE_MUSCLE_GROUPS.map((m) => [m.toLowerCase(), m]));
const DIFF_BY_LOWER = new Map(EXERCISE_DIFFICULTY_LEVELS.map((d) => [d.toLowerCase(), d]));

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function buildExerciseImportCsv(): string {
  const header = EXERCISE_IMPORT_COLUMNS.join(',');
  const notes = [
    `# Categorie: ${EXERCISE_ARCHIVE_CATEGORIES.join(' | ')}`,
    `# Muscoli (opzionale): ${EXERCISE_MUSCLE_GROUPS.join(' | ')}`,
    `# Difficolta (opzionale): ${EXERCISE_DIFFICULTY_LEVELS.join(' | ')}`,
    '# Video: solo YouTube o Vimeo. Muscoli opzionali; se più di uno, separali con virgola.',
  ].join('\n');
  const example = [
    'Back lever tuck',
    'Back lever',
    'Schiena, Core, Spalle',
    'principiante',
    'https://youtu.be/esempio',
    'Skill di leva posteriore',
    'Scapole attive, core chiuso',
    'Leve',
  ]
    .map(csvEscape)
    .join(',');
  return `\uFEFF${header}\n${notes}\n${example}\n`;
}

function exampleImportRow(): string[] {
  return [
    'Back lever tuck',
    'Back lever',
    'Schiena, Core, Spalle',
    'principiante',
    'https://youtu.be/esempio',
    'Skill di leva posteriore',
    'Scapole attive, core chiuso',
    'Leve',
  ];
}

export function buildExerciseImportWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const dataSheet = XLSX.utils.aoa_to_sheet([
    [...EXERCISE_IMPORT_COLUMNS],
    exampleImportRow(),
  ]);
  dataSheet['!cols'] = EXERCISE_IMPORT_COLUMNS.map((col) => ({
    wch: Math.max(14, col.length + 2),
  }));
  XLSX.utils.book_append_sheet(wb, dataSheet, 'Esercizi');

  const helpSheet = XLSX.utils.aoa_to_sheet([
    ['Campo', 'Obbligatorio', 'Note'],
    ['nome', 'Sì', 'Nome esercizio'],
    ['categoria', 'Sì', EXERCISE_ARCHIVE_CATEGORIES.join(' | ')],
    ['muscoli', 'No', EXERCISE_MUSCLE_GROUPS.join(' | ')],
    ['difficolta', 'No', EXERCISE_DIFFICULTY_LEVELS.join(' | ')],
    ['video_url', 'No', 'Solo YouTube o Vimeo'],
    ['descrizione', 'No', ''],
    ['istruzioni', 'No', ''],
    ['catalogo_pt', 'No', 'Cartella tra i tuoi cataloghi (creata se manca)'],
    [],
    ['Compila il foglio Esercizi: una riga = un esercizio. Non rinominare le intestazioni.'],
  ]);
  helpSheet['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, helpSheet, 'Istruzioni');
  return wb;
}

export function downloadExerciseImportTemplate() {
  const wb = buildExerciseImportWorkbook();
  XLSX.writeFile(wb, 'template-esercizi-livelapp.xlsx');
}

export function parseExerciseImportSpreadsheet(data: ArrayBuffer | Uint8Array): ExerciseImportParseResult {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(data, {
      type: 'array',
      raw: true,
      dense: true,
      cellDates: false,
      cellNF: false,
      cellStyles: false,
      sheetStubs: false,
    });
  } catch {
    return {
      rows: [],
      issues: [{ line: 1, message: 'File Excel non valido. Usa il template .xlsx scaricato da qui.' }],
    };
  }
  const sheetName =
    wb.SheetNames.find((n) => /elenco|eserciz/i.test(n) && !/blocc|protocol/i.test(n)) ??
    wb.SheetNames[0];
  if (!sheetName || !wb.Sheets[sheetName]) {
    return {
      rows: [],
      issues: [{ line: 1, message: 'Il file Excel non contiene fogli.' }],
    };
  }
  const aoa = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(wb.Sheets[sheetName], {
    header: 1,
    defval: '',
    raw: false,
    blankrows: true,
  });
  const grid = aoa.map((row) =>
    (Array.isArray(row) ? row : []).map((cell) => (cell == null ? '' : String(cell))),
  );
  return parseExerciseImportGrid(grid);
}

export async function parseExerciseImportFile(file: File): Promise<{
  rows: ExerciseImportRow[];
  issues: ExerciseImportIssue[];
}> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return parseExerciseImportSpreadsheet(await file.arrayBuffer());
  }
  if (name.endsWith('.csv') || file.type.includes('csv')) {
    return parseExerciseImportCsv(await file.text());
  }
  return {
    rows: [],
    issues: [{ line: 1, message: 'Carica un file Excel (.xlsx).' }],
  };
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',' || ch === ';') {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function normalizeHeader(h: string): string {
  return h
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
}

const HEADER_ALIASES: Record<string, (typeof EXERCISE_IMPORT_COLUMNS)[number]> = {
  nome: 'nome',
  nome_esercizio: 'nome',
  nome_esercizi: 'nome',
  esercizio: 'nome',
  name: 'nome',
  categoria: 'categoria',
  category: 'categoria',
  muscoli: 'muscoli',
  muscolo: 'muscoli',
  muscle_groups: 'muscoli',
  difficolta: 'difficolta',
  difficoltà: 'difficolta',
  difficulty: 'difficolta',
  video_url: 'video_url',
  video: 'video_url',
  link: 'video_url',
  links: 'video_url',
  tutorial: 'video_url',
  youtube: 'video_url',
  descrizione: 'descrizione',
  description: 'descrizione',
  istruzioni: 'istruzioni',
  instructions: 'istruzioni',
  catalogo_pt: 'catalogo_pt',
  catalogo: 'catalogo_pt',
};

function isSupportedVideoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    return (
      host === 'youtu.be' ||
      host.endsWith('youtube.com') ||
      host === 'vimeo.com' ||
      host.endsWith('vimeo.com')
    );
  } catch {
    return false;
  }
}

function looksLikeVideoCell(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  return /youtu\.be|youtube\.com|vimeo\.com/i.test(t);
}

function isHeaderLikeName(nome: string): boolean {
  const n = normalizeHeader(nome);
  return (
    n === 'categoria' ||
    n === 'nome' ||
    n === 'nome_esercizio' ||
    n === 'esercizio' ||
    n === 'link' ||
    n === 'mobility' ||
    n === 'video' ||
    n === 'tutorial'
  );
}

/** Excel PT (CORE, SPINTA, PALESTRA…) → categoria archivio Livelapp + cartella catalogo. */
export function mapExcelCategoryToArchive(raw: string): {
  categoria: ExerciseImportRow['categoria'] extends string ? string : string;
  catalogo: string;
} {
  const catalogo = raw.trim();
  const lower = catalogo.toLowerCase().replace(/\s+/g, ' ');
  const exact = CATEGORY_BY_LOWER.get(lower);
  if (exact) return { categoria: exact, catalogo };

  if (lower === 'core' || lower.includes('dragon flag') || lower === 'trx core') {
    return { categoria: 'Core', catalogo };
  }
  if (lower === 'legs' || lower.includes('legs')) return { categoria: 'Legs', catalogo };
  if (lower.includes('planche')) return { categoria: 'Planche', catalogo };
  if (lower.includes('front lever')) return { categoria: 'Front lever', catalogo };
  if (lower.includes('back lever')) return { categoria: 'Back lever', catalogo };
  if (lower.includes('human flag')) return { categoria: 'Human flag', catalogo };
  if (lower.includes('stretch')) return { categoria: 'Stretching', catalogo };
  if (lower === 'warmup' || lower === 'wup' || lower.startsWith('warm')) {
    return { categoria: 'Warm-up', catalogo };
  }
  if (lower.startsWith('mob') || lower.includes('mobility')) {
    return { categoria: 'Stretching', catalogo };
  }
  if (lower.includes('spinta') || lower === 'palestra') return { categoria: 'Push Up', catalogo };
  if (lower.includes('tirata')) return { categoria: 'Pull up', catalogo };
  if (lower.includes('handstand') || lower === 'hs') return { categoria: 'Handstand', catalogo };
  if (lower.includes('dip')) return { categoria: 'Dip', catalogo };
  if (lower.includes('l-sit') || lower.includes('lsit')) return { categoria: 'L-sit', catalogo };

  return { categoria: 'Altro', catalogo };
}

export type ExerciseImportParseResult = {
  rows: ExerciseImportRow[];
  issues: ExerciseImportIssue[];
  formatNote?: string;
};

function applyBanceLayoutIfNeeded(
  colIndex: Partial<Record<(typeof EXERCISE_IMPORT_COLUMNS)[number], number>>,
  parsedLines: string[][],
  headerIndex: number,
): { colIndex: typeof colIndex; formatNote?: string; headerIndex: number } {
  if (colIndex.nome != null && colIndex.categoria != null) {
    return { colIndex, headerIndex };
  }

  const samples = parsedLines.slice(Math.max(0, headerIndex), headerIndex + 12);
  const urlHitsCol2 = samples.filter((r) => looksLikeVideoCell(r[2] || '')).length;
  const namesCol1 = samples.filter((r) => (r[1] || '').trim().length > 2 && !looksLikeVideoCell(r[1] || '')).length;
  if (urlHitsCol2 >= 3 && namesCol1 >= 3) {
    return {
      colIndex: {
        categoria: 0,
        nome: 1,
        video_url: 2,
        ...colIndex,
      },
      headerIndex: headerIndex < 0 ? 0 : headerIndex,
      formatNote:
        'Formato elenco riconosciuto: colonna A = tua categoria (diventa catalogo PT), B = nome esercizio, C = link video. Muscoli non presenti: restano vuoti.',
    };
  }
  return { colIndex, headerIndex };
}

function parseMuscles(raw: string): { ok: string[]; error?: string } {
  const parts = raw
    .split(/[,;/|]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return { ok: [] };
  const ok: string[] = [];
  for (const p of parts) {
    const found = MUSCLE_BY_LOWER.get(p.toLowerCase());
    if (!found) return { ok: [], error: `Muscolo non valido: ${p}` };
    if (!ok.includes(found)) ok.push(found);
  }
  return { ok };
}

export function parseExerciseImportCsv(text: string): ExerciseImportParseResult {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  return parseExerciseImportGrid(lines.map((l) => parseCsvLine(l)));
}

export function parseExerciseImportGrid(grid: string[][]): ExerciseImportParseResult {
  const issues: ExerciseImportIssue[] = [];
  const rows: ExerciseImportRow[] = [];
  let headerIndex = -1;
  let colIndex: Partial<Record<(typeof EXERCISE_IMPORT_COLUMNS)[number], number>> = {};
  let formatNote: string | undefined;

  const rowText = (cells: string[]) => cells.map((c) => (c || '').trim()).join(' ');

  for (let i = 0; i < grid.length; i++) {
    const cells = grid[i] ?? [];
    const raw = rowText(cells);
    if (!raw || raw.startsWith('#')) continue;
    const maybeHeaders = cells.map(normalizeHeader);
    const mapped = maybeHeaders.map((h) => HEADER_ALIASES[h]);
    if (mapped.includes('nome') && mapped.includes('categoria')) {
      headerIndex = i;
      mapped.forEach((key, idx) => {
        if (key) colIndex[key] = idx;
      });
      formatNote =
        'Intestazioni template/elenco riconosciute. La colonna categoria del file diventa anche catalogo PT se catalogo_pt è vuoto.';
      break;
    }
    if (mapped.includes('nome') || mapped.includes('categoria') || mapped.includes('video_url')) {
      headerIndex = i;
      mapped.forEach((key, idx) => {
        if (key) colIndex[key] = idx;
      });
      break;
    }
  }

  const inferred = applyBanceLayoutIfNeeded(colIndex, grid, headerIndex);
  colIndex = inferred.colIndex;
  headerIndex = inferred.headerIndex;
  if (inferred.formatNote) formatNote = inferred.formatNote;

  if (headerIndex < 0 || colIndex.nome == null || colIndex.categoria == null) {
    const first = grid.find((c) => c.some((x) => String(x).trim())) ?? [];
    return {
      rows: [],
      issues: [
        {
          line: 1,
          message: `Non riconosco le colonne. Trovato in alto: ${first.filter(Boolean).slice(0, 6).join(' | ') || '(vuoto)'}. Serve almeno nome e categoria (anche come «NOME ESERCIZIO» e «CATEGORIA»), oppure tre colonne categoria / nome / link YouTube.`,
        },
      ],
    };
  }

  const get = (cells: string[], key: (typeof EXERCISE_IMPORT_COLUMNS)[number]) => {
    const idx = colIndex[key];
    if (idx == null) return '';
    return (cells[idx] || '').trim();
  };

  for (let i = headerIndex + 1; i < grid.length; i++) {
    const cells = grid[i] ?? [];
    const raw = rowText(cells);
    if (!raw || raw.startsWith('#')) continue;
    const line = i + 1;
    const nome = get(cells, 'nome');
    if (!nome || isHeaderLikeName(nome)) continue;

    const catRaw = get(cells, 'categoria');
    if (!catRaw) {
      issues.push({ line, message: 'Categoria vuota: la riga è stata saltata' });
      continue;
    }
    const mappedCat = mapExcelCategoryToArchive(catRaw);

    const muscles = parseMuscles(get(cells, 'muscoli'));
    if (muscles.error) {
      issues.push({ line, message: muscles.error });
      continue;
    }

    const diffRaw = get(cells, 'difficolta');
    let difficolta: ExerciseImportRow['difficolta'] = 'nessuno';
    if (diffRaw) {
      const d = DIFF_BY_LOWER.get(diffRaw.toLowerCase());
      if (!d) {
        issues.push({ line, message: `Difficoltà non valida: ${diffRaw}` });
        continue;
      }
      difficolta = d;
    }

    const videoRaw = get(cells, 'video_url');
    let video_url: string | null = null;
    if (videoRaw) {
      if (!isSupportedVideoUrl(videoRaw)) {
        issues.push({ line, message: `Link video non supportato (serve YouTube o Vimeo): ${videoRaw.slice(0, 80)}` });
        continue;
      }
      video_url = videoRaw;
    }

    rows.push({
      line,
      nome,
      categoria: mappedCat.categoria,
      muscoli: muscles.ok,
      difficolta,
      video_url,
      descrizione: get(cells, 'descrizione') || null,
      istruzioni: get(cells, 'istruzioni') || null,
      catalogo_pt: get(cells, 'catalogo_pt') || mappedCat.catalogo,
    });
  }

  return { rows, issues, formatNote };
}

export type ExerciseImportRowStatus = 'import' | 'skip_duplicate';

export type ExerciseImportPreviewRow = ExerciseImportRow & {
  status: ExerciseImportRowStatus;
};

export function classifyExerciseImportRows(
  rows: ExerciseImportRow[],
  existingNames: Iterable<string>,
): {
  preview: ExerciseImportPreviewRow[];
  toImport: ExerciseImportRow[];
  skipCount: number;
} {
  const seen = new Set(
    [...existingNames].map((n) => n.trim().toLowerCase()).filter(Boolean),
  );
  const preview: ExerciseImportPreviewRow[] = [];
  const toImport: ExerciseImportRow[] = [];

  for (const row of rows) {
    const key = row.nome.trim().toLowerCase();
    if (seen.has(key)) {
      preview.push({ ...row, status: 'skip_duplicate' });
      continue;
    }
    seen.add(key);
    preview.push({ ...row, status: 'import' });
    toImport.push(row);
  }

  return {
    preview,
    toImport,
    skipCount: preview.length - toImport.length,
  };
}
