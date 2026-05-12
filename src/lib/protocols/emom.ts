// =====================================================
// EMOM PROTOCOL — Block-based structure helpers (v2 simplified)
// =====================================================
// Schema:
//   {
//     rounds: number,
//     round_duration: number,   // SECONDI
//     blocks_count: number,     // sempre === blocks.length
//     blocks: [{ id, label?, exercises: [{ id, exercise_id?, name, reps }] }]
//   }
//
// `normalizeEmomParams` è una pura trasformazione in memoria:
// non scrive mai nel DB e non causa effetti collaterali.
// Serve solo per rendering e compat con EMOM legacy.
// =====================================================

export type EmomBlockExercise = {
  id: string;
  exercise_id?: string;
  name: string;
  reps: number;
};

export type EmomBlock = {
  id: string;
  label?: string;
  exercises: EmomBlockExercise[];
};

export type EmomParams = {
  rounds: number;
  round_duration: number; // secondi
  blocks_count: number;
  blocks: EmomBlock[];
  // Legacy retro-compat (mai usati nella nuova UI):
  duration_minutes?: number;
  mode?: 'single' | 'alternating' | 'ladder' | null;
  ladder?: string | null;
  reps?: number | null;
};

function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function makeEmomExercise(partial?: Partial<EmomBlockExercise>): EmomBlockExercise {
  return {
    id: uid('ex'),
    name: '',
    reps: 10,
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
 * Garantisce blocks.length === blocks_count.
 * Aumenta → append blocchi vuoti. Diminuisce → tronca.
 */
export function syncBlocksCount(blocks: EmomBlock[], count: number): EmomBlock[] {
  const target = Math.max(1, Math.floor(count));
  if (blocks.length === target) return blocks;
  if (blocks.length < target) {
    const next = [...blocks];
    while (next.length < target) next.push(makeEmomBlock());
    return next;
  }
  return blocks.slice(0, target);
}

/**
 * Normalizza i params EMOM nella nuova forma a blocchi.
 * Pura: nessun side-effect, nessuna scrittura DB.
 */
export function normalizeEmomParams(
  params: Record<string, unknown> | null | undefined,
  fallbackName?: string,
): EmomParams {
  const p = (params ?? {}) as Record<string, unknown>;

  // Durata round: priorità a round_duration (s); fallback su duration_minutes (legacy, *60).
  let round_duration: number;
  if (typeof p.round_duration === 'number' && p.round_duration > 0) {
    round_duration = Math.round(p.round_duration);
  } else if (typeof p.duration_minutes === 'number' && p.duration_minutes > 0) {
    round_duration = Math.round(p.duration_minutes * 60);
  } else {
    round_duration = 60;
  }

  const rounds =
    typeof p.rounds === 'number' && p.rounds > 0 ? Math.floor(p.rounds) : 10;

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
          // Reps: priorità a `reps`; fallback su vecchio `value` (se measure!=='time').
          let reps = 10;
          if (typeof ex.reps === 'number' && ex.reps > 0) {
            reps = Math.floor(ex.reps);
          } else if (
            typeof ex.value === 'number' &&
            ex.value > 0 &&
            ex.measure !== 'time'
          ) {
            reps = Math.floor(ex.value);
          }
          return {
            id: typeof ex.id === 'string' ? ex.id : uid('ex'),
            exercise_id:
              typeof ex.exercise_id === 'string' ? ex.exercise_id : undefined,
            name: typeof ex.name === 'string' ? ex.name : '',
            reps,
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
            reps: legacyReps ?? 10,
          },
        ],
      },
    ];
  }

  const blocks_count =
    typeof p.blocks_count === 'number' && p.blocks_count > 0
      ? Math.max(1, Math.floor(p.blocks_count))
      : blocks.length;

  // Sincronizza in memoria (non scrive nulla)
  const syncedBlocks = syncBlocksCount(blocks, blocks_count);

  return {
    rounds,
    round_duration,
    blocks_count: syncedBlocks.length,
    blocks: syncedBlocks,
    // legacy passthrough (utili se servisse leggerli altrove)
    duration_minutes: typeof p.duration_minutes === 'number' ? p.duration_minutes : undefined,
    mode: (p.mode as EmomParams['mode']) ?? undefined,
    ladder: (p.ladder as string | null | undefined) ?? null,
    reps: legacyReps,
  };
}

/** Etichetta auto-generata per un blocco (Blocco 1, Blocco 2, …). */
export function autoBlockLabel(index: number): string {
  return `Blocco ${index + 1}`;
}

/** Formatta secondi in "Ns" o "M'SS\"" / "M'". */
export function formatRoundDurationSeconds(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}"`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem === 0 ? `${m}'` : `${m}'${rem.toString().padStart(2, '0')}"`;
}
