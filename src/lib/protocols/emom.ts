// =====================================================
// EMOM PROTOCOL — Block-based structure helpers
// =====================================================
// Estende il protocollo EMOM esistente con supporto a "blocchi".
// I blocchi si alternano in loop sui round (round N -> blocks[(N-1) % len]).
// Mantiene compatibilità con EMOM legacy (nessun blocks[]) normalizzandoli
// come 1 blocco / 1 esercizio.
// =====================================================

export type EmomMeasure = 'reps' | 'time';
export type EmomProgression = 'fixed' | 'ladder';

export type EmomBlockExercise = {
  id: string;
  name: string;
  measure: EmomMeasure;
  value: number;
  progression: EmomProgression;
};

export type EmomBlock = {
  id: string;
  label?: string;
  exercises: EmomBlockExercise[];
};

export type EmomParams = {
  duration_minutes: number; // durata round (in minuti, storico)
  rounds: number;           // numero round totali
  mode?: 'single' | 'alternating' | 'ladder' | null;
  ladder?: string | null;
  reps?: number | null;     // legacy
  blocks: EmomBlock[];
};

// uid locale (no crypto richiesto: serve solo come react key stabile)
function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function makeEmomExercise(partial?: Partial<EmomBlockExercise>): EmomBlockExercise {
  return {
    id: uid('ex'),
    name: '',
    measure: 'reps',
    value: 10,
    progression: 'fixed',
    ...partial,
  };
}

export function makeEmomBlock(partial?: Partial<EmomBlock>): EmomBlock {
  return {
    id: uid('blk'),
    label: undefined,
    exercises: [makeEmomExercise()],
    ...partial,
  };
}

/**
 * Normalizza i params EMOM nella nuova forma a blocchi.
 * Se mancano blocks → genera 1 blocco con 1 esercizio derivato dai vecchi campi.
 */
export function normalizeEmomParams(
  params: Record<string, unknown> | null | undefined,
  fallbackName?: string,
): EmomParams {
  const p = (params ?? {}) as Record<string, unknown>;

  const duration_minutes =
    typeof p.duration_minutes === 'number' && p.duration_minutes > 0
      ? p.duration_minutes
      : 10;

  const rounds =
    typeof p.rounds === 'number' && p.rounds > 0 ? p.rounds : duration_minutes;

  const mode = (p.mode as EmomParams['mode']) ?? 'single';
  const ladder = (p.ladder as string | null | undefined) ?? null;
  const legacyReps = typeof p.reps === 'number' ? p.reps : null;

  const rawBlocks = Array.isArray(p.blocks) ? (p.blocks as unknown[]) : [];

  let blocks: EmomBlock[];
  if (rawBlocks.length > 0) {
    blocks = rawBlocks.map((b) => {
      const blk = (b ?? {}) as Record<string, unknown>;
      const exs = Array.isArray(blk.exercises) ? (blk.exercises as unknown[]) : [];
      return {
        id: typeof blk.id === 'string' ? blk.id : uid('blk'),
        label: typeof blk.label === 'string' ? blk.label : undefined,
        exercises: (exs.length > 0 ? exs : [{}]).map((e) => {
          const ex = (e ?? {}) as Record<string, unknown>;
          const measure: EmomMeasure = ex.measure === 'time' ? 'time' : 'reps';
          const progression: EmomProgression =
            ex.progression === 'ladder' ? 'ladder' : 'fixed';
          return {
            id: typeof ex.id === 'string' ? ex.id : uid('ex'),
            name: typeof ex.name === 'string' ? ex.name : '',
            measure,
            value:
              typeof ex.value === 'number' && ex.value > 0
                ? ex.value
                : measure === 'time'
                  ? 30
                  : 10,
            progression,
          };
        }),
      };
    });
  } else {
    // Legacy → 1 blocco / 1 esercizio
    blocks = [
      {
        id: uid('blk'),
        label: undefined,
        exercises: [
          {
            id: uid('ex'),
            name: fallbackName ?? '',
            measure: 'reps',
            value: legacyReps ?? 10,
            progression: mode === 'ladder' ? 'ladder' : 'fixed',
          },
        ],
      },
    ];
  }

  return {
    duration_minutes,
    rounds,
    mode,
    ladder,
    reps: legacyReps,
    blocks,
  };
}

/** Ritorna il blocco da eseguire in un dato round (1-indexed). */
export function getBlockForRound(blocks: EmomBlock[], roundIndex1Based: number): EmomBlock | null {
  if (!blocks.length) return null;
  const idx = ((roundIndex1Based - 1) % blocks.length + blocks.length) % blocks.length;
  return blocks[idx];
}

/** Etichetta auto-generata per un blocco (A, B, C, …) se non fornita. */
export function autoBlockLabel(index: number): string {
  // A..Z poi A1, A2…
  if (index < 26) return `Blocco ${String.fromCharCode(65 + index)}`;
  return `Blocco ${index + 1}`;
}
