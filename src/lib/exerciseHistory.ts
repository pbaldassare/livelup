// =====================================================
// Sessioni precedenti di un esercizio (riquadro "Le ultime volte").
// =====================================================

import { parseProtocolResults, sumDoneReps } from '@/lib/protocols/protocolResults';

export type PreviousLog = {
  set_number: number;
  reps_completed: number | null;
  weight_used: number | null;
  duration_seconds: number | null;
  is_completed?: boolean | null;
  protocol_results?: unknown;
};

export type PreviousSession = {
  workoutId: string;
  title: string;
  completedAt: string | null;
  logs: PreviousLog[];
};

function formatWeight(kg: number): string {
  return `${Number.isInteger(kg) ? kg : kg.toFixed(1).replace('.', ',')} kg`;
}

/** Valore di una singola serie: "10 reps @ 20 kg", "45s", "—". */
export function formatSetValue(log: PreviousLog | null | undefined): string {
  if (!log) return '—';
  const parts: string[] = [];
  if (log.reps_completed != null && log.reps_completed > 0) parts.push(`${log.reps_completed} reps`);
  else if (log.duration_seconds != null && log.duration_seconds > 0) parts.push(`${log.duration_seconds}s`);
  if (log.weight_used != null && log.weight_used > 0) parts.push(`@ ${formatWeight(Number(log.weight_used))}`);
  return parts.join(' ') || '—';
}

/**
 * Riassunto di una sessione: "10 · 10 · 8 reps · 20 kg".
 * Il carico è mostrato solo se è lo stesso su tutte le serie, altrimenti il massimo ("fino a 25 kg").
 */
export function formatSessionSummary(logs: PreviousLog[]): string {
  const sorted = [...logs].sort((a, b) => a.set_number - b.set_number);
  if (sorted.length === 0) return 'Nessun dato';

  const protocol = sorted.map((l) => parseProtocolResults(l.protocol_results)).find(Boolean);
  if (protocol) {
    const reps = sumDoneReps(protocol.entries);
    return reps > 0 ? `${reps} reps totali` : 'Completato';
  }

  const timed = sorted.every(
    (l) => (l.reps_completed == null || l.reps_completed === 0) && (l.duration_seconds ?? 0) > 0,
  );
  const values = sorted.map((l) =>
    timed ? `${l.duration_seconds ?? 0}` : `${l.reps_completed ?? 0}`,
  );
  const unit = timed ? 's' : ' reps';

  const weights = sorted
    .map((l) => (l.weight_used != null ? Number(l.weight_used) : 0))
    .filter((w) => w > 0);
  let load = '';
  if (weights.length > 0) {
    const max = Math.max(...weights);
    const allSame = weights.length === sorted.length && weights.every((w) => w === max);
    load = allSame ? ` · ${formatWeight(max)}` : ` · fino a ${formatWeight(max)}`;
  }

  return `${values.join(' · ')}${unit}${load}`;
}

export function findSetLog(logs: PreviousLog[], setNumber: number): PreviousLog | null {
  return logs.find((l) => l.set_number === setNumber) ?? null;
}

type RawWorkoutRow = {
  id: string;
  title: string | null;
  completed_at: string | null;
  workout_exercises?: Array<{ exercise_id?: string | null; workout_logs?: PreviousLog[] | null }> | null;
};

/** Dalle righe workouts (con workout_exercises!inner filtrati) alle ultime N sessioni con log. */
export function toPreviousSessions(rows: RawWorkoutRow[], limit = 3): PreviousSession[] {
  return rows
    .map((row) => ({
      workoutId: row.id,
      title: row.title ?? '',
      completedAt: row.completed_at,
      logs: (row.workout_exercises ?? []).find((we) => (we.workout_logs ?? []).length > 0)?.workout_logs ?? [],
    }))
    .filter((s) => s.logs.length > 0)
    .slice(0, limit);
}
