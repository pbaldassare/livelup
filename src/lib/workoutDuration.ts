// =====================================================
// Durata stimata di schede, allenamenti assegnati e corsi.
// Calcolata dai contenuti (serie, reps, tempo, recuperi, protocolli)
// invece di un valore manuale. Tutto in secondi; i minuti sono solo
// per visualizzazione e per la colonna persistita `estimated_duration`.
// =====================================================

import { resolveSetsData } from '@/lib/setsData';
import { normalizeEmomParams } from '@/lib/protocols/emom';
import { normalizeAmrapParams } from '@/lib/protocols/amrap';
import { normalizeSupersetParams } from '@/lib/protocols/superset';
import { normalizeTimedRoundsParams } from '@/lib/protocols/timedRounds';
import { normalizeNestedExercises } from '@/lib/protocols/nestedExercises';
import { normalizeWorkoutPhase, type WorkoutPhase } from '@/lib/pt/templateRoles';

/** Secondi per ripetizione quando la scheda non specifica un tempo (cadenza). */
export const DEFAULT_SECONDS_PER_REP = 3;
/** Reps ipotizzate quando il target non è valorizzato. */
export const DEFAULT_REPS = 10;
/** Ramping: le serie non sono fisse (si sale fino al KO). */
export const RAMPING_ESTIMATED_SETS = 5;
/** Dead Ladder: scalini ipotizzati prima del cedimento. */
export const DEAD_LADDER_ESTIMATED_STEPS = 5;

/** Riga `template_exercises` o `workout_exercises` (campi usati dal calcolo). */
export interface DurationExerciseRow {
  protocol_type?: string | null;
  protocol_params?: unknown;
  sets?: number | null;
  prescribed_sets?: number | null;
  reps_min?: number | null;
  reps_max?: number | null;
  prescribed_reps_min?: number | null;
  prescribed_reps_max?: number | null;
  rest_seconds?: number | null;
  prescribed_duration_seconds?: number | null;
  sets_data?: unknown;
  tempo?: string | null;
  phase?: string | null;
}

export interface ItemDuration {
  /** Lavoro + recuperi interni all'item. */
  seconds: number;
  /** Recupero dopo l'ultima serie: conta solo se segue un altro item. */
  trailingRestSeconds: number;
}

export interface SheetDuration {
  /** Allenamento principale (riepilogo sessione). */
  mainSeconds: number;
  /** Riscaldamento / stretching: opzionali, esclusi dal totale. */
  warmupSeconds: number;
  cooldownSeconds: number;
}

type Target = { mode?: string | null; reps?: number | null; duration_seconds?: number | null };

function posNum(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function nonNeg(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * Cadenza a 4 cifre Eccentrica-Pausa-Concentrica-Pausa (es. "3010" → 4 s/rep).
 * "X" (esplosivo) vale 1 s. Formati non validi → null.
 */
export function parseTempoSeconds(tempo: string | null | undefined): number | null {
  if (!tempo) return null;
  const clean = tempo.replace(/[\s\-/.:]/g, '').toUpperCase();
  if (!/^[0-9X]{4}$/.test(clean)) return null;
  const total = clean
    .split('')
    .reduce((acc, ch) => acc + (ch === 'X' ? 1 : Number(ch)), 0);
  return total > 0 ? total : null;
}

export function secondsPerRep(tempo?: string | null): number {
  return parseTempoSeconds(tempo) ?? DEFAULT_SECONDS_PER_REP;
}

/** Reps testuali dei corsi: "10" → 10, "8-12" → 10, "max" → default. */
export function parseRepsText(reps: string | number | null | undefined): number {
  if (typeof reps === 'number') return reps > 0 ? reps : DEFAULT_REPS;
  if (!reps) return DEFAULT_REPS;
  const nums = (reps.match(/\d+(?:[.,]\d+)?/g) || [])
    .map((n) => Number(n.replace(',', '.')))
    .filter((n) => n > 0);
  if (!nums.length) return DEFAULT_REPS;
  if (nums.length >= 2 && /[-–]/.test(reps)) return (nums[0] + nums[1]) / 2;
  return nums[0];
}

/** Secondi di lavoro di un singolo target (set, esercizio di protocollo). */
export function targetWorkSeconds(target: Target | null | undefined, spr: number): number {
  if (target?.mode === 'seconds') {
    return posNum(target.duration_seconds) ?? 0;
  }
  const reps = posNum(target?.reps) ?? DEFAULT_REPS;
  return reps * spr;
}

function item(seconds: number, trailingRestSeconds = 0): ItemDuration {
  return {
    seconds: Math.max(0, Math.round(seconds)),
    trailingRestSeconds: Math.max(0, Math.round(trailingRestSeconds)),
  };
}

/** N ripetizioni di un blocco con recupero fra le ripetizioni (non dopo l'ultima). */
function repeated(count: number, blockSeconds: number, restBetween: number): ItemDuration {
  const n = Math.max(0, Math.floor(count));
  if (n === 0) return item(0);
  return item(n * blockSeconds + (n - 1) * restBetween, restBetween);
}

function standardSets(row: DurationExerciseRow, spr: number): ItemDuration {
  const sets = resolveSetsData(row.sets_data, {
    sets: row.sets ?? row.prescribed_sets ?? 1,
    reps_min: row.reps_min ?? row.prescribed_reps_min ?? null,
    reps_max: row.reps_max ?? row.prescribed_reps_max ?? null,
    rest_seconds: row.rest_seconds ?? null,
    prescribed_duration_seconds: row.prescribed_duration_seconds ?? null,
  });
  if (!sets.length) return item(0);
  let seconds = 0;
  sets.forEach((set, i) => {
    seconds += targetWorkSeconds(set, spr);
    if (i < sets.length - 1) seconds += nonNeg(set.rest_seconds);
  });
  return item(seconds, nonNeg(sets[sets.length - 1].rest_seconds));
}

function nestedTargets(params: Record<string, unknown>): Target[] {
  return normalizeNestedExercises(params);
}

/** Durata di una riga scheda (set standard o protocollo). */
export function estimateExerciseRowDuration(row: DurationExerciseRow): ItemDuration {
  const type = (row.protocol_type || 'SET').toUpperCase();
  const p = (row.protocol_params && typeof row.protocol_params === 'object'
    ? row.protocol_params
    : {}) as Record<string, unknown>;
  const spr = secondsPerRep(row.tempo);

  switch (type) {
    case 'EMOM': {
      const emom = normalizeEmomParams(p);
      return item(emom.rounds * emom.round_duration);
    }
    case 'AMRAP':
      return item(normalizeAmrapParams(p).duration_seconds);
    case 'TABATA':
    case 'HIIT': {
      const tr = normalizeTimedRoundsParams(p);
      const n = tr.exercises.length;
      const round = n * tr.exercise_duration_seconds + (n - 1) * tr.rest_between_exercises_seconds;
      return item(tr.rounds * round + (tr.rounds - 1) * tr.rest_between_rounds_seconds);
    }
    case 'SUPERSET': {
      const ss = normalizeSupersetParams(p);
      const between = ss.rest_between_exercises_enabled ? ss.rest_between_exercises ?? 0 : 0;
      let seconds = 0;
      for (let c = 0; c < ss.supersets_count; c++) {
        ss.set_data.forEach((rowData, r) => {
          seconds += targetWorkSeconds(rowData.sets[c] ?? ss.exercises[r], spr);
        });
        seconds += Math.max(0, ss.set_data.length - 1) * between;
        if (c < ss.supersets_count - 1) seconds += ss.rest_between_supersets;
      }
      return item(seconds, ss.rest_between_supersets);
    }
    case 'TOP_SET_BACKOFF': {
      const exercises = nestedTargets(p);
      const rest = nonNeg(p.top_rest, 120);
      const topSets = posNum(p.top_sets) ?? 1;
      const topReps = posNum(p.top_reps) ?? 5;
      const backoff = p.backoff_enabled !== false;
      const boSets = backoff ? posNum(p.backoff_sets) ?? 3 : 0;
      const boReps = posNum(p.backoff_reps) ?? 8;
      const setsPerExercise = topSets + boSets;
      const workPerExercise = (topSets * topReps + boSets * boReps) * spr;
      const totalSets = setsPerExercise * exercises.length;
      return item(workPerExercise * exercises.length + Math.max(0, totalSets - 1) * rest, rest);
    }
    case 'RAMPING': {
      const exercises = nestedTargets(p);
      const reps = posNum(p.reps) ?? 5;
      const rest = nonNeg(p.rest_seconds, 120);
      const sets = (posNum(p.sets) ?? RAMPING_ESTIMATED_SETS) * exercises.length;
      return repeated(sets, reps * spr, rest);
    }
    case 'LADDER':
    case 'DEAD_LADDER': {
      const exercises = nestedTargets(p);
      let steps: number[];
      if (type === 'LADDER') {
        const raw = Array.isArray(p.ladder_steps) ? (p.ladder_steps as unknown[]) : [];
        steps = raw.map(posNum).filter((n): n is number => n != null);
        if (!steps.length) steps = [1, 2, 3];
      } else {
        const start = posNum(p.start_reps) ?? 1;
        steps = Array.from({ length: DEAD_LADDER_ESTIMATED_STEPS }, (_, i) => start + i);
      }
      const stepRest = nonNeg(p.step_rest_seconds, 20);
      const setRest = nonNeg(p.set_rest_seconds, 90);
      const repsPerSet = steps.reduce((a, b) => a + b, 0);
      const ladder =
        repsPerSet * spr * exercises.length + (steps.length - 1) * stepRest;
      return repeated(posNum(p.sets) ?? 3, ladder, setRest);
    }
    case 'RXT': {
      const exercises = nestedTargets(p);
      const round = exercises.reduce((acc, ex) => acc + targetWorkSeconds(ex, spr), 0);
      return repeated(posNum(p.rounds) ?? 5, round, nonNeg(p.max_rest_seconds));
    }
    case 'RUNNING_TOTAL': {
      const raw = Array.isArray(p.exercises) ? p.exercises : [];
      if (!raw.length) return item((posNum(p.target_reps) ?? 50) * spr);
      const exercises = nestedTargets(p);
      return item(exercises.reduce((acc, ex) => acc + targetWorkSeconds(ex, spr), 0));
    }
    default:
      return standardSets(row, spr);
  }
}

/** Somma una sequenza: il recupero finale dell'ultimo item non conta. */
export function sumSequence(items: ItemDuration[]): number {
  if (!items.length) return 0;
  const total = items.reduce((acc, it) => acc + it.seconds + it.trailingRestSeconds, 0);
  return total - items[items.length - 1].trailingRestSeconds;
}

/**
 * Durata stimata di una scheda: righe ordinate per `order_index`.
 * Righe warmup/cooldown (phase) finiscono nei totali separati.
 */
export function estimateSheetDuration(rows: DurationExerciseRow[]): SheetDuration {
  const byPhase: Record<WorkoutPhase, ItemDuration[]> = { warmup: [], main: [], cooldown: [] };
  for (const row of rows) {
    byPhase[normalizeWorkoutPhase(row.phase)].push(estimateExerciseRowDuration(row));
  }
  return {
    mainSeconds: sumSequence(byPhase.main),
    warmupSeconds: sumSequence(byPhase.warmup),
    cooldownSeconds: sumSequence(byPhase.cooldown),
  };
}

/** Riscaldamento/stretching come lista esercizi: stessi default di templateLoader (1×10, 30"). */
export function estimateRoutineExerciseListSeconds(count: number): number {
  const rows: DurationExerciseRow[] = Array.from({ length: Math.max(0, count) }, () => ({
    protocol_type: 'SET',
    sets: 1,
    reps_min: DEFAULT_REPS,
    rest_seconds: 30,
  }));
  return estimateSheetDuration(rows).mainSeconds;
}

// ---------- Corsi ----------

export interface DurationCourseStepExercise {
  sets?: number | null;
  reps?: string | number | null;
  rest_seconds?: number | null;
}

export interface DurationCourseStep {
  step_type?: string | null;
  video_duration_minutes?: number | null;
  pt_course_step_exercises?: DurationCourseStepExercise[] | null;
}

export function estimateCourseStepSeconds(step: DurationCourseStep): number {
  if (step.step_type === 'video') {
    return Math.round((posNum(step.video_duration_minutes) ?? 0) * 60);
  }
  const rows: DurationExerciseRow[] = (step.pt_course_step_exercises || []).map((ex) => ({
    protocol_type: 'SET',
    sets: posNum(ex.sets) ?? 1,
    reps_min: parseRepsText(ex.reps),
    rest_seconds: ex.rest_seconds ?? 60,
  }));
  return Math.round(estimateSheetDuration(rows).mainSeconds);
}

export function estimateCourseSeconds(steps: DurationCourseStep[] | null | undefined): number {
  return (steps || []).reduce((acc, s) => acc + estimateCourseStepSeconds(s), 0);
}

// ---------- Formattazione ----------

/** Minuti interi da persistere (`estimated_duration`, `duration_minutes`); null se vuoto. */
export function secondsToRoundedMinutes(seconds: number | null | undefined): number | null {
  if (!seconds || seconds <= 0) return null;
  return Math.max(1, Math.round(seconds / 60));
}

/** "~45 min", "~1 h 15 min", "—" se vuoto. */
export function formatEstimatedDuration(seconds: number | null | undefined): string {
  const minutes = secondsToRoundedMinutes(seconds);
  if (minutes == null) return '—';
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `~${h} h` : `~${h} h ${m} min`;
}
