// =====================================================
// PT ASSISTANT — parsing leggero italiano → slot catalogo DB
// Nessuna generazione AI: solo match su entità esistenti.
// =====================================================

import type {
  CatalogAthlete,
  CatalogExercise,
  CatalogProgram,
  CatalogTemplate,
  PTCatalog,
} from '@/lib/api/ptCatalog';
import { PROTOCOL_REGISTRY, type ProtocolType } from '@/lib/protocols/registry';

export type AssignmentMode = 'program' | 'scheda';

export type AssistantSlots = {
  mode: AssignmentMode;
  athleteId: string | null;
  programId: string | null;
  templateId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  activeDays: number[];
  exerciseIds: string[];
  protocolTypes: string[];
};

const WEEKDAY_WORDS: Record<string, number> = {
  lun: 1,
  lunedì: 1,
  lunedi: 1,
  mar: 2,
  martedì: 2,
  martedi: 2,
  mer: 3,
  mercoledì: 3,
  mercoledi: 3,
  gio: 4,
  giovedì: 4,
  giovedi: 4,
  ven: 5,
  venerdì: 5,
  venerdi: 5,
  sab: 6,
  sabato: 6,
  dom: 7,
  domenica: 7,
};

const PROTOCOL_KEYWORDS: Record<string, ProtocolType> = {
  amrap: 'AMRAP',
  emom: 'EMOM',
  superset: 'SUPERSET',
  tabata: 'TABATA',
  hiit: 'HIIT',
  ramping: 'RAMPING',
  ladder: 'LADDER',
  'dead ladder': 'DEAD_LADDER',
  'top set': 'TOP_SET_BACKOFF',
  backoff: 'TOP_SET_BACKOFF',
  set: 'SET',
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreMatch(haystack: string, needle: string): number {
  const h = normalize(haystack);
  const n = normalize(needle);
  if (!n) return 0;
  if (h === n) return 100;
  if (h.includes(n)) return 80;
  const parts = n.split(' ').filter(Boolean);
  const hits = parts.filter((p) => h.includes(p)).length;
  return hits > 0 ? 40 + hits * 15 : 0;
}

function scoreBidirectional(a: string, b: string): number {
  return Math.max(scoreMatch(a, b), scoreMatch(b, a));
}

export function matchAthletes(text: string, athletes: CatalogAthlete[]): CatalogAthlete[] {
  return athletes
    .map((a) => ({
      a,
      score: scoreBidirectional(a.displayName, text) + scoreMatch(a.email || '', text),
    }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .map((x) => x.a);
}

export function matchPrograms(text: string, programs: CatalogProgram[]): CatalogProgram[] {
  return programs
    .map((p) => ({
      p,
      score: scoreBidirectional(p.name, text) + scoreMatch(p.description || '', text),
    }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .map((x) => x.p);
}

export function matchTemplates(text: string, templates: CatalogTemplate[]): CatalogTemplate[] {
  return templates
    .map((t) => ({ t, score: scoreBidirectional(t.title, text) }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .map((x) => x.t);
}

export function matchExercises(text: string, exercises: CatalogExercise[]): CatalogExercise[] {
  return exercises
    .map((e) => ({ e, score: scoreBidirectional(e.name, text) }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .map((x) => x.e);
}

export function matchProtocols(text: string): string[] {
  const n = normalize(text);
  const found = new Set<string>();
  for (const [keyword, type] of Object.entries(PROTOCOL_KEYWORDS)) {
    if (n.includes(keyword)) found.add(type);
  }
  for (const def of Object.values(PROTOCOL_REGISTRY)) {
    if (n.includes(normalize(def.label))) found.add(def.type);
  }
  return [...found];
}

function detectMode(text: string): AssignmentMode {
  const n = normalize(text);
  const hasScheda = /\bscheda\b/.test(n);
  const hasProgramma = /\bprogramma\b/.test(n);
  if (hasScheda && !hasProgramma) return 'scheda';
  if (hasProgramma) return 'program';
  return 'scheda';
}

function parseStartDate(text: string): Date | null {
  const n = normalize(text);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (/\boggi\b/.test(n)) return today;
  if (/\bdomani\b/.test(n)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }

  for (const [word, iso] of Object.entries(WEEKDAY_WORDS)) {
    const re = new RegExp(`\\b(da\\s+|inizio\\s+)?${word}\\b`);
    if (re.test(n)) {
      const d = new Date(today);
      const current = d.getDay() === 0 ? 7 : d.getDay();
      let delta = iso - current;
      if (delta <= 0) delta += 7;
      if (/\bprossim/.test(n) && delta === 0) delta = 7;
      d.setDate(d.getDate() + delta);
      return d;
    }
  }

  const dm = n.match(/\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\b/);
  if (dm) {
    const day = parseInt(dm[1], 10);
    const month = parseInt(dm[2], 10) - 1;
    const year = dm[3] ? parseInt(dm[3].length === 2 ? `20${dm[3]}` : dm[3], 10) : today.getFullYear();
    const d = new Date(year, month, day);
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
}

function parseEndDate(text: string, startDate: Date | null): Date | null {
  const n = normalize(text);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weeksMatch = n.match(/\b(\d+)\s*sett(?:imane|\.?)?\b/);
  if (weeksMatch && startDate) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + parseInt(weeksMatch[1], 10) * 7);
    return d;
  }

  if (/\bfino\b|\bfine\b|\bal\b/.test(n)) {
    for (const [word] of Object.entries(WEEKDAY_WORDS)) {
      const re = new RegExp(`\\b(fino\\s+(al|a)|fine\\s+|al)\\s*${word}\\b`);
      if (re.test(n)) {
        const iso = WEEKDAY_WORDS[word];
        const base = startDate ? new Date(startDate) : new Date(today);
        base.setHours(0, 0, 0, 0);
        const current = base.getDay() === 0 ? 7 : base.getDay();
        let delta = iso - current;
        if (delta <= 0) delta += 7;
        base.setDate(base.getDate() + delta);
        return base;
      }
    }

    const dm = n.match(/\b(?:fino\s+(?:al|a)|fine\s+|al)\s*(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\b/);
    if (dm) {
      const day = parseInt(dm[1], 10);
      const month = parseInt(dm[2], 10) - 1;
      const year = dm[3] ? parseInt(dm[3].length === 2 ? `20${dm[3]}` : dm[3], 10) : today.getFullYear();
      const d = new Date(year, month, day);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }

  return null;
}

export function parseActiveDays(text: string): number[] {
  const n = normalize(text);
  const found = new Set<number>();

  for (const [word, iso] of Object.entries(WEEKDAY_WORDS)) {
    const re = new RegExp(`\\b${word}\\b`, 'g');
    if (re.test(n)) found.add(iso);
  }

  return [...found].sort();
}

export function parseAssistantCommand(text: string, catalog: PTCatalog): AssistantSlots {
  const mode = detectMode(text);
  const athleteMatches = matchAthletes(text, catalog.athletes);
  const programMatches = matchPrograms(text, catalog.programs);
  const templateMatches = matchTemplates(text, catalog.templates);
  const exerciseMatches = matchExercises(text, catalog.exercises);
  const protocolTypes = matchProtocols(text);

  const program = programMatches[0] ?? null;
  const template = templateMatches[0] ?? null;
  const parsedDays = parseActiveDays(text);
  const startDate = parseStartDate(text);
  const endDate = parseEndDate(text, startDate);

  let activeDays = parsedDays;
  if (activeDays.length === 0 && program?.activeDays?.length) {
    activeDays = [...program.activeDays];
  }

  const resolvedMode: AssignmentMode =
    mode === 'program' && program ? 'program' : template ? 'scheda' : mode;

  return {
    mode: resolvedMode,
    athleteId: athleteMatches[0]?.id ?? null,
    programId: resolvedMode === 'program' ? program?.id ?? null : null,
    templateId:
      resolvedMode === 'scheda'
        ? template?.id ?? null
        : program?.schedules[0]?.templateId ?? template?.id ?? null,
    startDate: startDate ?? new Date(),
    endDate,
    activeDays,
    exerciseIds: exerciseMatches.map((e) => e.id),
    protocolTypes,
  };
}

export const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mer',
  4: 'Gio',
  5: 'Ven',
  6: 'Sab',
  7: 'Dom',
};

/** ISO weekday (1=Mon) → JS getDay() (0=Sun) */
export function isoToJsDay(iso: number): number {
  return iso === 7 ? 0 : iso;
}

export function jsDayToIso(js: number): number {
  return js === 0 ? 7 : js;
}
