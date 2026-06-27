// =====================================================
// PT ASSISTANT — parsing NL italiano → creazione catalogo
// =====================================================

import type { PTCatalog } from '@/lib/api/ptCatalog';
import {
  PROTOCOL_REGISTRY,
  getDefaultParamsForProtocol,
  getProtocolDef,
  type ProtocolType,
} from '@/lib/protocols/registry';

export type CreateIntent = 'exercise' | 'template' | 'protocol' | 'program';

export type FieldSource = 'text' | 'default' | 'catalog';

export type PreviewField = {
  key: string;
  label: string;
  displayValue: string;
  source: FieldSource;
  required: boolean;
};

export type ExerciseCreatePayload = {
  intent: 'exercise';
  name: string;
  category: string;
  muscleGroups: string[];
  difficultyLevel: string;
  description: string | null;
  instructions: string | null;
  videoUrl: string | null;
  equipment: string[] | null;
  isPublic: boolean;
};

export type TemplateCreatePayload = {
  intent: 'template';
  title: string;
  description: string | null;
  difficultyLevel: string;
  estimatedDuration: number;
  muscleGroups: string[];
  category: string | null;
  tags: string[] | null;
  exerciseIds: string[];
};

export type ProtocolCreatePayload = {
  intent: 'protocol';
  templateId: string;
  templateTitle: string;
  exerciseId: string;
  exerciseName: string;
  protocolType: ProtocolType;
  sets: number;
  repsMin: number;
  repsMax: number | null;
  restSeconds: number;
  notes: string | null;
  tempo: string | null;
  prescribedDurationSeconds: number | null;
  protocolParams: Record<string, unknown>;
};

export type ProgramCreatePayload = {
  intent: 'program';
  name: string;
  description: string | null;
  notes: string | null;
  durationWeeks: number;
  activeDays: number[];
  mode: 'recurring' | 'day_by_day';
  templateIds: string[];
  templateTitles: string[];
};

export type CreatePayload =
  | ExerciseCreatePayload
  | TemplateCreatePayload
  | ProtocolCreatePayload
  | ProgramCreatePayload;

export type ParsedCreateResult = {
  intent: CreateIntent | null;
  intentLabel: string;
  fields: PreviewField[];
  payload: CreatePayload | null;
  valid: boolean;
};

const CATEGORIES = [
  'Forza', 'Cardio', 'Mobilità', 'Funzionale', 'Calisthenics',
  'Kettlebell', 'Stretching', 'Posturale', 'Pilates', 'Yoga', 'HIIT', 'Altro',
];

const MUSCLE_MAP: Record<string, string> = {
  petto: 'Petto', schiena: 'Schiena', spalle: 'Spalle', spalla: 'Spalle',
  bicipiti: 'Bicipiti', bicipite: 'Bicipiti', tricipiti: 'Tricipiti', tricipite: 'Tricipiti',
  quadricipiti: 'Quadricipiti', quadricipite: 'Quadricipiti', gambe: 'Quadricipiti',
  femorali: 'Femorali', femorale: 'Femorali', glutei: 'Glutei', gluteo: 'Glutei',
  polpacci: 'Polpacci', polpaccio: 'Polpacci', addominali: 'Addominali', addome: 'Addominali',
  core: 'Core', 'full body': 'Full Body', fullbody: 'Full Body',
  avambracci: 'Avambracci', trapezio: 'Trapezio',
};

const DIFFICULTY_MAP: Record<string, string> = {
  principiante: 'principiante', beginner: 'principiante',
  intermedio: 'intermedio', intermediate: 'intermedio',
  avanzato: 'avanzato', advanced: 'avanzato',
  agonista: 'agonista', nessuno: 'nessuno',
};

const WEEKDAY_WORDS: Record<string, number> = {
  lun: 1, lunedì: 1, lunedi: 1, mar: 2, martedì: 2, martedi: 2,
  mer: 3, mercoledì: 3, mercoledi: 3, gio: 4, giovedì: 4, giovedi: 4,
  ven: 5, venerdì: 5, venerdi: 5, sab: 6, sabato: 6, dom: 7, domenica: 7,
};

const PROTOCOL_KEYWORDS: Record<string, ProtocolType> = {
  amrap: 'AMRAP', emom: 'EMOM', superset: 'SUPERSET', tabata: 'TABATA',
  hiit: 'HIIT', ramping: 'RAMPING', ladder: 'LADDER', set: 'SET',
};

const EQUIPMENT_WORDS = [
  'manubri', 'bilanciere', 'kettlebell', 'box', 'elastico', 'cavo', 'macchina', 'trx', 'palla medica',
];

const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Gio', 5: 'Ven', 6: 'Sab', 7: 'Dom',
};

export const NL_EXAMPLES = [
  'Crea esercizio Box Jump categoria Forza muscoli gambe glutei intermedio istruzioni salta sulla scatola attrezzatura box',
  'Crea scheda FORZA PURA 60 min principiante petto schiena core con Box Jump tag forza',
  'Su scheda FORZA PURA protocollo EMOM per Box Jump 12 minuti 4 serie 10 reps recupero 45s carico 20 kg note salto esplosivo',
  'Crea programma PROGRAMMA BASE 4 settimane lunedi mercoledi venerdi note ciclo base con schede FORZA PURA e GAG',
];

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ').trim();
}

function field(
  key: string,
  label: string,
  value: unknown,
  source: FieldSource,
  required: boolean,
): PreviewField {
  const empty = value === null || value === undefined || value === '' ||
    (Array.isArray(value) && value.length === 0);
  const displayValue = empty
    ? '—'
    : Array.isArray(value)
      ? value.join(', ')
      : String(value);
  return { key, label, displayValue, source, required };
}

function detectIntent(n: string): CreateIntent | null {
  if (/\b(protocollo|emom|amrap|superset|tabata)\b/.test(n) && /\b(su scheda|nella scheda|scheda)\b/.test(n)) {
    return 'protocol';
  }
  if (/\b(crea|nuovo|aggiungi)\s+(esercizio)\b/.test(n) || /\besercizio\b/.test(n) && !/\bscheda\b/.test(n) && !/\bprogramma\b/.test(n)) {
    if (/\bcrea\s+esercizio\b/.test(n) || /\bnuovo\s+esercizio\b/.test(n) || /\besercizio\s+[a-z0-9]/i.test(n)) return 'exercise';
  }
  if (/\b(crea|nuova|aggiungi)\s+(scheda)\b/.test(n) || (/\bscheda\b/.test(n) && !/\bprogramma\b/.test(n) && !/\bprotocollo\b/.test(n))) {
    return 'template';
  }
  if (/\b(crea|nuovo|aggiungi)\s+(programma)\b/.test(n) || /\bprogramma\b/.test(n)) return 'program';
  if (/\bprotocollo\b/.test(n)) return 'protocol';
  return null;
}

function parseMuscleGroups(n: string): { groups: string[]; fromText: boolean } {
  const found = new Set<string>();
  for (const [word, label] of Object.entries(MUSCLE_MAP)) {
    if (new RegExp(`\\b${word}\\b`).test(n)) found.add(label);
  }
  const m = n.match(/\bmuscol[ioei]*\s+([a-z\s,]+?)(?:\s+(?:categoria|diffic|descri|istruz|con|tag|note|attrezz|$))/);
  if (m) {
    for (const part of m[1].split(/[\s,]+/)) {
      const key = part.trim();
      if (MUSCLE_MAP[key]) found.add(MUSCLE_MAP[key]);
    }
  }
  return { groups: [...found], fromText: found.size > 0 };
}

function parseCategory(n: string): { value: string; fromText: boolean } {
  const m = n.match(/\bcategoria\s+([a-zàèéìòù]+)/i);
  if (m) {
    const c = CATEGORIES.find((x) => normalize(x) === normalize(m[1]));
    if (c) return { value: c, fromText: true };
  }
  for (const c of CATEGORIES) {
    if (new RegExp(`\\b${normalize(c)}\\b`).test(n)) return { value: c, fromText: true };
  }
  return { value: 'Altro', fromText: false };
}

function parseDifficulty(n: string): { value: string; fromText: boolean } {
  for (const [word, level] of Object.entries(DIFFICULTY_MAP)) {
    if (new RegExp(`\\b${word}\\b`).test(n)) return { value: level, fromText: true };
  }
  return { value: 'nessuno', fromText: false };
}

function parseDurationMinutes(n: string): { value: number; fromText: boolean } {
  const h = n.match(/\b(\d+)\s*or[ae]\b/);
  if (h) return { value: parseInt(h[1], 10) * 60, fromText: true };
  const m = n.match(/\b(\d+)\s*(?:min(?:uti)?|minuti)\b/);
  if (m) return { value: parseInt(m[1], 10), fromText: true };
  return { value: 60, fromText: false };
}

function parseWeeks(n: string): { value: number; fromText: boolean } {
  const m = n.match(/\b(\d+)\s*sett(?:imane|\.?)?\b/);
  if (m) return { value: parseInt(m[1], 10), fromText: true };
  return { value: 4, fromText: false };
}

function parseActiveDays(n: string): { days: number[]; fromText: boolean } {
  const found = new Set<number>();
  for (const [word, iso] of Object.entries(WEEKDAY_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(n)) found.add(iso);
  }
  const days = [...found].sort();
  return { days: days.length > 0 ? days : [1, 3, 5], fromText: days.length > 0 };
}

function parseSetsRepsRest(n: string) {
  const setsM = n.match(/\b(\d+)\s*ser(?:ie|e)?\b/);
  const repsRange = n.match(/\b(\d+)\s*[-–]\s*(\d+)\s*rep/i);
  const repsM = n.match(/\b(\d+)\s*rep(?:s|etizioni)?\b/);
  const restM = n.match(/\b(?:recupero|rec\.?)\s*(\d+)\s*(?:s|sec|secondi)?\b/);
  const weightM = n.match(/\b(?:carico|peso)\s*(\d+(?:[.,]\d+)?)\s*(?:kg)?\b/);
  const durM = n.match(/\b(\d+)\s*(?:min(?:uti)?|')\b/);
  const durSecM = n.match(/\b(\d+)\s*(?:s|sec|secondi)\b(?!.*recupero)/);

  return {
    sets: setsM ? parseInt(setsM[1], 10) : null,
    repsMin: repsRange ? parseInt(repsRange[1], 10) : repsM ? parseInt(repsM[1], 10) : null,
    repsMax: repsRange ? parseInt(repsRange[2], 10) : null,
    restSeconds: restM ? parseInt(restM[1], 10) : null,
    weight: weightM ? parseFloat(weightM[1].replace(',', '.')) : null,
    durationMinutes: durM ? parseInt(durM[1], 10) : null,
    durationSeconds: durSecM ? parseInt(durSecM[1], 10) : null,
  };
}

function parseProtocolType(n: string): { type: ProtocolType; fromText: boolean } {
  for (const [kw, type] of Object.entries(PROTOCOL_KEYWORDS)) {
    if (new RegExp(`\\b${kw}\\b`).test(n)) return { type, fromText: true };
  }
  for (const def of Object.values(PROTOCOL_REGISTRY)) {
    if (n.includes(normalize(def.label))) return { type: def.type, fromText: true };
  }
  return { type: 'SET', fromText: false };
}

function extractSection(n: string, keyword: string): string | null {
  const re = new RegExp(`\\b${keyword}\\s+(.+?)(?:\\s+(?:categoria|muscol|diffic|descri|istruz|attrezz|video|tag|note|con|recupero|serie|rep|$))`, 'i');
  const m = n.match(re);
  return m ? m[1].trim() : null;
}

function matchTemplate(n: string, catalog: PTCatalog) {
  let best: { id: string; title: string; score: number } | null = null;
  const su = n.match(/\b(?:su|nella|scheda)\s+(?:scheda\s+)?([a-z0-9\s]+?)(?:\s+(?:protocollo|per|con|emom|amrap|$))/i);
  const candidates = su ? [su[1].trim()] : [];
  for (const t of catalog.templates) {
    const tn = normalize(t.title);
    if (n.includes(tn)) candidates.push(t.title);
  }
  for (const t of catalog.templates) {
    const tn = normalize(t.title);
    for (const c of candidates) {
      const cn = normalize(c);
      if (tn === cn || tn.includes(cn) || cn.includes(tn)) {
        const score = tn === cn ? 100 : 80;
        if (!best || score > best.score) best = { id: t.id, title: t.title, score };
      }
    }
    if (n.includes(tn)) {
      if (!best || 70 > best.score) best = { id: t.id, title: t.title, score: 70 };
    }
  }
  return best;
}

function matchExercise(n: string, catalog: PTCatalog, excludeTemplate = false) {
  const per = n.match(/\bper\s+([a-z0-9\s]+?)(?:\s+(?:\d+\s*serie|\d+\s*rep|emom|amrap|recupero|note|$))/i);
  const con = n.match(/\bcon\s+([a-z0-9\s]+?)(?:\s+(?:\d+\s*serie|tag|note|$))/i);
  const candidates: string[] = [];
  if (per) candidates.push(per[1].trim());
  if (con && !excludeTemplate) candidates.push(con[1].trim());

  let best: { id: string; name: string; score: number } | null = null;
  for (const e of catalog.exercises) {
    const en = normalize(e.name);
    if (candidates.some((c) => normalize(c).includes(en) || en.includes(normalize(c)))) {
      best = { id: e.id, name: e.name, score: 90 };
    } else if (n.includes(en)) {
      if (!best || best.score < 70) best = { id: e.id, name: e.name, score: 70 };
    }
  }
  return best;
}

function matchTemplatesInProgram(n: string, catalog: PTCatalog): { ids: string[]; titles: string[] } {
  const ids: string[] = [];
  const titles: string[] = [];
  const conIdx = n.search(/\b(?:con|schede|sequenza)\b/);
  const segment = conIdx >= 0 ? n.slice(conIdx) : n;
  for (const t of catalog.templates) {
    if (normalize(segment).includes(normalize(t.title))) {
      if (!ids.includes(t.id)) {
        ids.push(t.id);
        titles.push(t.title);
      }
    }
  }
  return { ids, titles };
}

function parseExerciseName(n: string): string | null {
  const m = n.match(/\b(?:crea|nuovo|aggiungi)\s+esercizio\s+(.+?)(?:\s+(?:categoria|muscol|diffic|descri|istruz|attrezz|video|tag|note|$))/i)
    ?? n.match(/\besercizio\s+(.+?)(?:\s+(?:categoria|muscol|diffic|descri|istruz|attrezz|video|$))/i);
  if (m) return m[1].trim().replace(/\b(categoria|muscoli|muscol)\b.*/i, '').trim();
  return null;
}

function parseTemplateTitle(n: string): string | null {
  const m = n.match(/\b(?:crea|nuova|aggiungi)\s+scheda\s+(.+?)(?:\s+(?:\d+\s*min|\d+\s*or|princip|intermed|avanz|muscol|descri|con|tag|note|$))/i)
    ?? n.match(/\bscheda\s+([A-Z0-9][A-Z0-9\s]+?)(?:\s+(?:\d+\s*min|\d+\s*or|princip|intermed|avanz|muscol|con|tag|$))/);
  if (m) return m[1].trim();
  const caps = n.match(/\b([A-Z][A-Z0-9\s]{2,})\b/);
  return caps ? caps[1].trim() : null;
}

function parseProgramName(n: string): string | null {
  const m = n.match(/\b(?:crea|nuovo|aggiungi)\s+programma\s+(.+?)(?:\s+(?:\d+\s*sett|lun|mar|mer|gio|ven|descri|note|con|schede|$))/i)
    ?? n.match(/\bprogramma\s+(.+?)(?:\s+(?:\d+\s*sett|lun|mar|mer|gio|ven|descri|note|con|$))/i);
  if (m) return m[1].trim();
  return null;
}

function parseEquipment(n: string): { items: string[]; fromText: boolean } {
  const sec = extractSection(n, 'attrezzatura') ?? extractSection(n, 'attrezz');
  const items: string[] = [];
  if (sec) items.push(...sec.split(/[\s,]+/).filter(Boolean));
  for (const w of EQUIPMENT_WORDS) {
    if (new RegExp(`\\b${w}\\b`).test(n)) items.push(w);
  }
  return { items: [...new Set(items)], fromText: items.length > 0 };
}

function parseTags(n: string): { tags: string[]; fromText: boolean } {
  const m = n.match(/\btag\s+([a-z0-9\s,]+?)(?:\s+(?:note|con|descri|$))/i);
  if (!m) return { tags: [], fromText: false };
  return { tags: m[1].split(/[\s,]+/).filter(Boolean), fromText: true };
}

function parseNotes(n: string): string | null {
  const m = n.match(/\bnote\s+(.+?)$/i);
  return m ? m[1].trim() : null;
}

function parseVideoUrl(n: string): string | null {
  const m = n.match(/\b(?:video|url)\s+(https?:\/\/\S+)/i);
  return m ? m[1] : null;
}

function parseTempo(n: string): string | null {
  const m = n.match(/\btempo\s+([\d\-]+(?:\-\d+)*)\b/i);
  return m ? m[1] : null;
}

export function parseCreateCommand(
  text: string,
  catalog: PTCatalog,
  forcedIntent?: CreateIntent | null,
): ParsedCreateResult {
  const raw = text.trim();
  if (!raw && !forcedIntent) {
    return { intent: null, intentLabel: '—', fields: [], payload: null, valid: false };
  }

  const n = normalize(text);
  const intent = forcedIntent ?? detectIntent(n);
  const intentLabels: Record<CreateIntent, string> = {
    exercise: 'Esercizio',
    template: 'Scheda',
    protocol: 'Protocollo',
    program: 'Programma',
  };

  if (!intent) {
    return {
      intent: null,
      intentLabel: 'Non riconosciuto',
      fields: [field('hint', 'Suggerimento', 'Inizia con: Crea esercizio / Crea scheda / Protocollo su scheda… / Crea programma', 'default', false)],
      payload: null,
      valid: false,
    };
  }

  if (intent === 'exercise') {
    const name = parseExerciseName(n) ?? parseExerciseName(text) ?? '';
    const category = parseCategory(n);
    const muscles = parseMuscleGroups(n);
    const difficulty = parseDifficulty(n);
    const description = extractSection(n, 'descrizione');
    const instructions = extractSection(n, 'istruzioni') ?? extractSection(n, 'esecuzione');
    const videoUrl = parseVideoUrl(n);
    const equipment = parseEquipment(n);
    const isPublic = /\bpubblico\b/.test(n);

    const fields: PreviewField[] = [
      field('name', 'Nome', name || null, name ? 'text' : 'default', true),
      field('category', 'Categoria', category.value, category.fromText ? 'text' : 'default', true),
      field('muscleGroups', 'Gruppi muscolari', muscles.groups, muscles.fromText ? 'text' : 'default', false),
      field('difficultyLevel', 'Difficoltà', difficulty.value === 'nessuno' ? 'Non specificato' : difficulty.value, difficulty.fromText ? 'text' : 'default', false),
      field('description', 'Descrizione', description, description ? 'text' : 'default', false),
      field('instructions', 'Istruzioni', instructions, instructions ? 'text' : 'default', false),
      field('videoUrl', 'Video URL', videoUrl, videoUrl ? 'text' : 'default', false),
      field('equipment', 'Attrezzatura', equipment.items, equipment.fromText ? 'text' : 'default', false),
      field('isPublic', 'Pubblico', isPublic ? 'Sì' : 'No', isPublic ? 'text' : 'default', false),
    ];

    const valid = !!name.trim() && !!category.value;
    const payload: ExerciseCreatePayload | null = valid ? {
      intent: 'exercise',
      name: name.trim(),
      category: category.value,
      muscleGroups: muscles.groups,
      difficultyLevel: difficulty.value,
      description,
      instructions,
      videoUrl,
      equipment: equipment.items.length > 0 ? equipment.items : null,
      isPublic,
    } : null;

    return { intent, intentLabel: intentLabels.exercise, fields, payload, valid };
  }

  if (intent === 'template') {
    const title = parseTemplateTitle(text) ?? parseTemplateTitle(n) ?? '';
    const duration = parseDurationMinutes(n);
    const difficulty = parseDifficulty(n);
    const muscles = parseMuscleGroups(n);
    const description = extractSection(n, 'descrizione');
    const tags = parseTags(n);
    const category = parseCategory(n);
    const matchedEx = matchExercise(n, catalog, true);
    const exerciseIds = matchedEx ? [matchedEx.id] : [];

    const conMatch = n.match(/\bcon\s+(.+?)(?:\s+tag|\s+note|$)/i);
    if (conMatch) {
      for (const e of catalog.exercises) {
        if (normalize(conMatch[1]).includes(normalize(e.name)) && !exerciseIds.includes(e.id)) {
          exerciseIds.push(e.id);
        }
      }
    }

    const fields: PreviewField[] = [
      field('title', 'Titolo', title || null, title ? 'text' : 'default', true),
      field('estimatedDuration', 'Durata (min)', duration.value, duration.fromText ? 'text' : 'default', false),
      field('difficultyLevel', 'Livello', difficulty.value === 'nessuno' ? 'Non specificato' : difficulty.value, difficulty.fromText ? 'text' : 'default', false),
      field('muscleGroups', 'Gruppi muscolari', muscles.groups, muscles.fromText ? 'text' : 'default', false),
      field('category', 'Categoria scheda', category.fromText ? category.value : null, category.fromText ? 'text' : 'default', false),
      field('description', 'Descrizione', description, description ? 'text' : 'default', false),
      field('tags', 'Tag', tags.tags, tags.fromText ? 'text' : 'default', false),
      field('exercises', 'Esercizi inclusi', exerciseIds.map((id) => catalog.exercises.find((e) => e.id === id)?.name ?? id), exerciseIds.length > 0 ? 'catalog' : 'default', false),
    ];

    const valid = !!title.trim();
    const payload: TemplateCreatePayload | null = valid ? {
      intent: 'template',
      title: title.trim(),
      description,
      difficultyLevel: difficulty.value,
      estimatedDuration: duration.value,
      muscleGroups: muscles.groups,
      category: category.fromText ? category.value : null,
      tags: tags.tags.length > 0 ? tags.tags : null,
      exerciseIds,
    } : null;

    return { intent, intentLabel: intentLabels.template, fields, payload, valid };
  }

  if (intent === 'protocol') {
    const tpl = matchTemplate(n, catalog);
    const ex = matchExercise(n, catalog);
    const proto = parseProtocolType(n);
    const nums = parseSetsRepsRest(n);
    const notes = parseNotes(text);
    const tempo = parseTempo(n);

    const sets = nums.sets ?? 3;
    const repsMin = nums.repsMin ?? 10;
    const repsMax = nums.repsMax;
    const restSeconds = nums.restSeconds ?? 60;

    const protocolParams: Record<string, unknown> = {
      ...getDefaultParamsForProtocol(proto.type),
      ...(nums.weight != null ? { weight: nums.weight } : {}),
      ...(nums.durationMinutes != null ? { duration_minutes: nums.durationMinutes } : {}),
      ...(nums.durationSeconds != null ? { duration_seconds: nums.durationSeconds } : {}),
      sets,
      reps: repsMin,
      rest_seconds: restSeconds,
    };

    const fields: PreviewField[] = [
      field('template', 'Scheda', tpl?.title ?? null, tpl ? 'catalog' : 'default', true),
      field('exercise', 'Esercizio', ex?.name ?? null, ex ? 'catalog' : 'default', true),
      field('protocolType', 'Protocollo', getProtocolDef(proto.type).label, proto.fromText ? 'text' : 'default', true),
      field('sets', 'Serie', sets, nums.sets != null ? 'text' : 'default', false),
      field('reps', 'Ripetizioni', repsMax ? `${repsMin}–${repsMax}` : repsMin, nums.repsMin != null ? 'text' : 'default', false),
      field('restSeconds', 'Recupero (s)', restSeconds, nums.restSeconds != null ? 'text' : 'default', false),
      field('weight', 'Carico (kg)', nums.weight, nums.weight != null ? 'text' : 'default', false),
      field('duration', 'Durata', nums.durationMinutes ? `${nums.durationMinutes} min` : nums.durationSeconds ? `${nums.durationSeconds} s` : null, nums.durationMinutes || nums.durationSeconds ? 'text' : 'default', false),
      field('notes', 'Note', notes, notes ? 'text' : 'default', false),
      field('tempo', 'Tempo', tempo, tempo ? 'text' : 'default', false),
    ];

    const valid = !!tpl && !!ex;
    const payload: ProtocolCreatePayload | null = valid ? {
      intent: 'protocol',
      templateId: tpl!.id,
      templateTitle: tpl!.title,
      exerciseId: ex!.id,
      exerciseName: ex!.name,
      protocolType: proto.type,
      sets,
      repsMin,
      repsMax,
      restSeconds,
      notes,
      tempo,
      prescribedDurationSeconds: nums.durationSeconds,
      protocolParams,
    } : null;

    return { intent, intentLabel: intentLabels.protocol, fields, payload, valid };
  }

  // program
  const name = parseProgramName(text) ?? parseProgramName(n) ?? '';
  const weeks = parseWeeks(n);
  const days = parseActiveDays(n);
  const description = extractSection(n, 'descrizione');
  const notes = parseNotes(text);
  const mode = /\bgiorno\s+per\s+giorno\b|\bday\s+by\s+day\b/.test(n) ? 'day_by_day' as const : 'recurring' as const;
  const { ids: templateIds, titles: templateTitles } = matchTemplatesInProgram(n, catalog);

  const fields: PreviewField[] = [
    field('name', 'Nome', name || null, name ? 'text' : 'default', true),
    field('durationWeeks', 'Durata (sett.)', weeks.value, weeks.fromText ? 'text' : 'default', false),
    field('activeDays', 'Giorni attivi', days.days.map((d) => WEEKDAY_LABELS[d]).join(', '), days.fromText ? 'text' : 'default', true),
    field('mode', 'Modalità', mode === 'day_by_day' ? 'Giorno per giorno' : 'Ricorrente', /\bgiorno\s+per\s+giorno\b/.test(n) ? 'text' : 'default', false),
    field('templates', 'Sequenza schede', templateTitles.join(' → '), templateTitles.length > 0 ? 'catalog' : 'default', true),
    field('description', 'Descrizione', description, description ? 'text' : 'default', false),
    field('notes', 'Note', notes, notes ? 'text' : 'default', false),
  ];

  const valid = !!name.trim() && templateIds.length > 0 && days.days.length > 0;
  const payload: ProgramCreatePayload | null = valid ? {
    intent: 'program',
    name: name.trim(),
    description,
    notes,
    durationWeeks: weeks.value,
    activeDays: days.days,
    mode,
    templateIds,
    templateTitles,
  } : null;

  return { intent, intentLabel: intentLabels.program, fields, payload, valid };
}
