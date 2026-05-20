// =====================================================
// TIMED ROUNDS — Shared params for HIIT and TABATA
// Stesso schema, stesso editor, stessa normalizzazione.
// =====================================================

export interface TimedRoundsExercise {
  /** uuid locale per identificare la riga in UI (stable key) */
  id: string;
  /** id esercizio del template/workout corrente, se selezionato dal dropdown */
  exercise_id?: string;
  /** nome esercizio — sempre presente, fallback leggibile per legacy */
  name: string;
  /** note libere opzionali */
  notes?: string;
}

export interface TimedRoundsParams {
  exercises_count: number;
  exercise_duration_seconds: number;
  rest_between_exercises_seconds: number;
  rest_between_rounds_seconds: number;
  rounds: number;
  exercises: TimedRoundsExercise[];
}

const DEFAULTS = {
  exercises_count: 1,
  exercise_duration_seconds: 40,
  rest_between_exercises_seconds: 20,
  rest_between_rounds_seconds: 60,
  rounds: 4,
} as const;

function uid(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* noop */
  }
  return `tr_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function makeTimedRoundsExercise(
  init: Partial<TimedRoundsExercise> = {},
): TimedRoundsExercise {
  return {
    id: init.id || uid(),
    exercise_id: init.exercise_id,
    name: init.name ?? '',
    notes: init.notes,
  };
}

export function syncExercisesCount(
  list: TimedRoundsExercise[],
  count: number,
): TimedRoundsExercise[] {
  const n = Math.max(1, Math.floor(count) || 1);
  if (list.length === n) return list;
  if (list.length > n) return list.slice(0, n);
  const out = list.slice();
  while (out.length < n) out.push(makeTimedRoundsExercise());
  return out;
}

function num(v: unknown, fallback: number, min = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.floor(n));
}

/**
 * Normalizza in memoria i params HIIT/TABATA verso lo schema TimedRounds.
 * Legge anche i campi legacy (work_seconds, rest_seconds, rounds, intervals_total)
 * senza scrivere nulla nel DB. Il commit avviene solo quando il PT modifica.
 */
export function normalizeTimedRoundsParams(
  raw: Record<string, unknown> | null | undefined,
): TimedRoundsParams {
  const p = (raw ?? {}) as Record<string, unknown>;

  // Esercizi: nuovo schema o legacy/mancante
  const rawExercises = Array.isArray(p.exercises) ? (p.exercises as unknown[]) : [];
  let exercises: TimedRoundsExercise[] = rawExercises
    .map((e) => {
      if (!e || typeof e !== 'object') return null;
      const ex = e as Record<string, unknown>;
      const name =
        (typeof ex.name === 'string' && ex.name) ||
        (typeof ex.exercise_name === 'string' && ex.exercise_name) ||
        '';
      const exercise_id =
        (typeof ex.exercise_id === 'string' && ex.exercise_id) || undefined;
      const id = (typeof ex.id === 'string' && ex.id) || uid();
      const notes = typeof ex.notes === 'string' ? ex.notes : undefined;
      return { id, name, exercise_id, notes } as TimedRoundsExercise;
    })
    .filter((x): x is TimedRoundsExercise => x !== null);

  if (exercises.length === 0) {
    exercises = [makeTimedRoundsExercise()];
  }

  // Conteggi e tempi: nuovi → legacy → default
  const exercise_duration_seconds = num(
    p.exercise_duration_seconds ?? p.work_seconds,
    DEFAULTS.exercise_duration_seconds,
    1,
  );
  const rest_between_exercises_seconds = num(
    p.rest_between_exercises_seconds ?? p.rest_seconds,
    DEFAULTS.rest_between_exercises_seconds,
    0,
  );
  const rest_between_rounds_seconds = num(
    p.rest_between_rounds_seconds,
    DEFAULTS.rest_between_rounds_seconds,
    0,
  );
  const rounds = num(p.rounds ?? p.intervals_total, DEFAULTS.rounds, 1);

  const exercises_count = num(
    p.exercises_count,
    exercises.length || DEFAULTS.exercises_count,
    1,
  );

  // Allinea sempre exercises.length a exercises_count
  exercises = syncExercisesCount(exercises, exercises_count);

  return {
    exercises_count: exercises.length,
    exercise_duration_seconds,
    rest_between_exercises_seconds,
    rest_between_rounds_seconds,
    rounds,
    exercises,
  };
}
