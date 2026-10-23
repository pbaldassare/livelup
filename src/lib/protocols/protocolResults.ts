// =====================================================
// Risultati effettivi per esercizio dentro un protocollo
// (SUPERSET / EMOM / AMRAP / HIIT / TABATA).
// Persistiti in workout_logs.protocol_results (jsonb).
// =====================================================

import { getProtocolTargetMode } from '@/lib/protocols/exerciseTarget';
import type { SetTargetMode } from '@/types/database';

export type ProtocolResultEntry = {
  /** 1-based; null = totale sull'intero blocco (AMRAP). */
  round: number | null;
  exercise_index: number;
  exercise_id?: string | null;
  name: string;
  mode: SetTargetMode;
  /** Ripetizioni o secondi prescritti; null se il protocollo non fissa un target (HIIT a tempo). */
  target: number | null;
  /** Ripetizioni o secondi fatti davvero. */
  done: number;
};

export type ProtocolResults = {
  version: 1;
  protocol: string;
  rounds_completed?: number;
  entries: ProtocolResultEntry[];
};

type TargetSource = {
  id?: string;
  exercise_id?: string | null;
  name?: string | null;
  mode?: SetTargetMode | null;
  reps?: number | null;
  duration_seconds?: number | null;
};

export function targetValue(source: TargetSource | null | undefined): number | null {
  if (!source) return null;
  const v = getProtocolTargetMode(source) === 'seconds' ? source.duration_seconds : source.reps;
  return typeof v === 'number' && v > 0 ? Math.floor(v) : null;
}

export function buildResultEntry(params: {
  round: number | null;
  exerciseIndex: number;
  source: TargetSource | null | undefined;
  fallbackName: string;
  done?: number | null;
  /** Forza la modalità (HIIT: si contano le reps in un intervallo a tempo). */
  mode?: SetTargetMode;
  target?: number | null;
}): ProtocolResultEntry {
  const mode = params.mode ?? getProtocolTargetMode(params.source ?? null);
  const target = params.target !== undefined ? params.target : targetValue(params.source);
  const done = params.done ?? target ?? 0;
  return {
    round: params.round,
    exercise_index: params.exerciseIndex,
    exercise_id: params.source?.exercise_id ?? null,
    name: params.source?.name?.trim() || params.fallbackName,
    mode,
    target,
    done: clampDone(done),
  };
}

export function clampDone(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(9999, Math.max(0, Math.floor(value)));
}

export function sumDoneReps(entries: ProtocolResultEntry[]): number {
  return entries.reduce((sum, e) => sum + (e.mode === 'reps' ? e.done : 0), 0);
}

export function sumDoneSeconds(entries: ProtocolResultEntry[]): number {
  return entries.reduce((sum, e) => sum + (e.mode === 'seconds' ? e.done : 0), 0);
}

export function isEntryShort(entry: ProtocolResultEntry): boolean {
  return entry.target != null && entry.done < entry.target;
}

export function formatEntryValue(entry: Pick<ProtocolResultEntry, 'mode' | 'done' | 'target'>): string {
  const unit = entry.mode === 'seconds' ? 's' : '';
  const done = `${entry.done}${unit}`;
  if (entry.target == null) return entry.mode === 'seconds' ? done : `${done} reps`;
  return entry.mode === 'seconds' ? `${done}/${entry.target}s` : `${done}/${entry.target} reps`;
}

export function parseProtocolResults(raw: unknown): ProtocolResults | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.entries)) return null;
  const entries = (r.entries as unknown[])
    .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
    .map((e) => ({
      round: typeof e.round === 'number' ? e.round : null,
      exercise_index: typeof e.exercise_index === 'number' ? e.exercise_index : 0,
      exercise_id: typeof e.exercise_id === 'string' ? e.exercise_id : null,
      name: typeof e.name === 'string' && e.name.trim() ? e.name : 'Esercizio',
      mode: (e.mode === 'seconds' ? 'seconds' : 'reps') as SetTargetMode,
      target: typeof e.target === 'number' ? e.target : null,
      done: typeof e.done === 'number' ? clampDone(e.done) : 0,
    }));
  if (entries.length === 0) return null;
  return {
    version: 1,
    protocol: typeof r.protocol === 'string' ? r.protocol : '',
    rounds_completed: typeof r.rounds_completed === 'number' ? r.rounds_completed : undefined,
    entries,
  };
}

/** Raggruppa per round mantenendo l'ordine (null = "Totale"). */
export function groupEntriesByRound<T extends Pick<ProtocolResultEntry, 'round'>>(
  entries: T[],
): Array<{ round: number | null; entries: T[] }> {
  const groups: Array<{ round: number | null; entries: T[] }> = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    if (last && last.round === entry.round) last.entries.push(entry);
    else groups.push({ round: entry.round, entries: [entry] });
  }
  return groups;
}

export function actualValueLabel(mode: SetTargetMode): string {
  return mode === 'seconds' ? 'Secondi fatti' : 'Ripetizioni fatte';
}

export function roundLabel(protocol: string, round: number | null): string {
  if (round == null) return 'Totale';
  return protocol === 'SUPERSET' ? `Superset ${round}` : `Round ${round}`;
}
