// =====================================================
// Helpers condivisi per mappare esercizi/protocolli → DTO PDF
// =====================================================

import { formatSetTarget, getSetTargetMode, resolveSetsData } from '@/lib/setsData';
import { formatProtocolTarget } from '@/lib/protocols/exerciseTarget';
import { formatLoadLabel, getLoadMode, normalizeLoad } from '@/lib/loadPrescription';
import {
  describeExerciseProtocol,
  getProtocolDef,
  isProtocolType,
  type ProtocolParams,
  type ProtocolType,
} from '@/lib/protocols/registry';
import type {
  SheetItem,
  SheetNestedExercise,
  SheetSetRow,
} from '@/lib/pdf/workoutSheetTypes';

export type RawSheetExerciseRow = {
  order_index?: number;
  notes?: string | null;
  tempo?: string | null;
  sets?: number | null;
  reps_min?: number | null;
  reps_max?: number | null;
  rest_seconds?: number | null;
  prescribed_sets?: number | null;
  prescribed_reps_min?: number | null;
  prescribed_reps_max?: number | null;
  prescribed_weight?: number | null;
  prescribed_duration_seconds?: number | null;
  sets_data?: unknown;
  protocol_type?: string | null;
  protocol_params?: unknown;
  protocol_name?: string | null;
  exercises?: {
    name?: string | null;
    category?: string | null;
    muscle_groups?: string[] | null;
    instructions?: string | null;
  } | null;
};

export function formatProfileName(profile?: {
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
} | null): string | null {
  if (!profile) return null;
  const full = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  if (full) return full;
  if (profile.nickname?.trim()) return profile.nickname.trim();
  return null;
}

function formatReps(min?: number | null, max?: number | null, single?: number | null): string | null {
  if (single != null && Number.isFinite(single)) return String(single);
  if (min != null && max != null && min !== max) return `${min}–${max}`;
  if (min != null) return String(min);
  if (max != null) return String(max);
  return null;
}

function formatLoadForSheet(
  raw: Parameters<typeof normalizeLoad>[0],
  fallbackWeight?: number | null,
): string | null {
  const load = normalizeLoad(raw);
  if (
    getLoadMode(load) === 'bodyweight' &&
    (fallbackWeight == null || !Number.isFinite(Number(fallbackWeight)) || Number(fallbackWeight) <= 0)
  ) {
    return 'CL';
  }
  if (getLoadMode(load) === 'kg' && (load.weight == null || load.weight <= 0) && fallbackWeight != null) {
    return String(fallbackWeight);
  }
  const label = formatLoadLabel(
    getLoadMode(load) === 'kg' && (load.weight == null || load.weight <= 0) && fallbackWeight != null
      ? { load_mode: 'kg', weight: fallbackWeight }
      : load,
  );
  return label || null;
}

function toSetRowsFromSetsData(
  sets_data: unknown,
  flat: {
    sets?: number | null;
    reps_min?: number | null;
    reps_max?: number | null;
    rest_seconds?: number | null;
    prescribed_duration_seconds?: number | null;
    prescribed_weight?: number | null;
  },
): SheetSetRow[] {
  const resolved = resolveSetsData(sets_data, {
    sets: flat.sets,
    reps_min: flat.reps_min,
    reps_max: flat.reps_max,
    rest_seconds: flat.rest_seconds,
    prescribed_duration_seconds: flat.prescribed_duration_seconds,
  });

  return resolved.map((s, i) => {
    const mode = getSetTargetMode(s);
    const target = formatSetTarget(s);
    return {
      setNumber: i + 1,
      // Colonna "Reps / Tempo": "10" oppure "20s"
      reps:
        target !== '—'
          ? target
          : mode === 'reps'
            ? formatReps(flat.reps_min, flat.reps_max)
            : null,
      kg: formatLoadForSheet(s, flat.prescribed_weight ?? null),
      restSeconds: s.rest_seconds ?? flat.rest_seconds ?? null,
      durationSeconds:
        mode === 'seconds'
          ? s.duration_seconds ?? flat.prescribed_duration_seconds ?? null
          : null,
    };
  });
}

function extractNestedExercises(params: ProtocolParams | null | undefined): SheetNestedExercise[] {
  const p = params || {};
  const out: SheetNestedExercise[] = [];

  const targetOrNull = (t: Parameters<typeof formatProtocolTarget>[0]): string | null => {
    const label = formatProtocolTarget(t);
    return label === '—' ? null : label;
  };

  if (Array.isArray(p.set_data) && p.set_data.length > 0) {
    for (const entry of p.set_data) {
      const sets: SheetSetRow[] = (entry.sets || []).map((s) => {
        const isSeconds = s.mode === 'seconds';
        return {
          setNumber: s.set_number ?? 0,
          reps: targetOrNull(s),
          kg: formatLoadForSheet(s),
          restSeconds: s.rest_seconds ?? null,
          durationSeconds: isSeconds ? s.duration_seconds ?? null : null,
        };
      });
      out.push({
        name: entry.exercise_name || 'Esercizio',
        notes: undefined,
        sets: sets.length ? sets : undefined,
        reps: sets[0]?.reps ?? null,
        kg: sets[0]?.kg ?? null,
      });
    }
    return out;
  }

  if (Array.isArray(p.blocks) && p.blocks.length > 0) {
    for (const block of p.blocks) {
      const label = block.label ? `${block.label}: ` : '';
      for (const ex of block.exercises || []) {
        out.push({
          name: `${label}${ex.name || 'Esercizio'}`,
          reps: targetOrNull(ex),
          kg: formatLoadForSheet(ex),
        });
      }
    }
    return out;
  }

  if (Array.isArray(p.exercises) && p.exercises.length > 0) {
    for (const ex of p.exercises) {
      out.push({
        name: ex.name || 'Esercizio',
        reps: targetOrNull(ex),
        kg: formatLoadForSheet(ex),
        notes: ex.notes || null,
      });
    }
  }

  return out;
}

function buildProtocolParamLines(
  type: ProtocolType,
  params: ProtocolParams | null | undefined,
): string[] {
  const p = params || {};
  const lines: string[] = [];

  const push = (label: string, value: unknown) => {
    if (value == null || value === '') return;
    if (Array.isArray(value) && value.length === 0) return;
    lines.push(`${label}: ${Array.isArray(value) ? value.join(', ') : String(value)}`);
  };

  switch (type) {
    case 'EMOM':
      push('Durata (min)', p.duration_minutes);
      push('Round', p.rounds);
      push('Intervallo (s)', p.interval_seconds ?? p.round_duration);
      push('Modalità', p.mode);
      push('Reps', p.reps);
      break;
    case 'AMRAP':
      push('Durata (min)', p.duration_minutes);
      if (p.duration_seconds != null) push('Durata (s)', p.duration_seconds);
      push('Note', p.note);
      break;
    case 'SUPERSET':
      push('Superset', p.supersets_count ?? p.sets);
      push('Recupero tra esercizi (s)', p.rest_between_exercises ?? p.internal_rest_seconds);
      push('Recupero tra superset (s)', p.rest_between_supersets ?? p.external_rest_seconds);
      push('Note', p.note);
      break;
    case 'TOP_SET_BACKOFF':
      push('Top set', `${p.top_sets ?? 1}×${p.top_reps ?? p.top_set?.reps ?? '—'}`);
      if (p.backoff_enabled !== false) {
        push('Back off', `${p.backoff_sets ?? p.back_off?.sets ?? 3}×${p.backoff_reps ?? '—'}`);
        push('% riduzione', p.backoff_percentage ?? p.back_off?.drop_pct);
      }
      break;
    case 'RAMPING':
      push('Reps', p.reps);
      push('Recupero (s)', p.rest_seconds);
      push('Unità', p.value_type);
      push('Note', p.note);
      break;
    case 'LADDER':
      push('Scala', p.ladder_steps);
      push('Serie', p.sets);
      push('Recupero scalini (s)', p.step_rest_seconds);
      push('Recupero serie (s)', p.set_rest_seconds);
      break;
    case 'DEAD_LADDER':
      push('Serie', p.sets);
      push('Start reps', p.start_reps);
      push('Recupero scalini (s)', p.step_rest_seconds);
      break;
    case 'TABATA':
    case 'HIIT':
      push('Round', p.rounds);
      push('Lavoro (s)', p.exercise_duration_seconds ?? p.work_seconds);
      push('Recupero esercizi (s)', p.rest_between_exercises_seconds ?? p.rest_seconds);
      push('Recupero round (s)', p.rest_between_rounds_seconds);
      break;
    case 'RXT':
      push('Round', p.rounds);
      push('Max recupero (s)', p.max_rest_seconds);
      break;
    case 'RUNNING_TOTAL':
      push('Target reps', p.target_reps);
      break;
    default:
      break;
  }

  return lines;
}

export function mapRawRowsToSheetItems(rows: RawSheetExerciseRow[]): SheetItem[] {
  const sorted = [...rows].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
  );

  return sorted.map((row): SheetItem => {
    const ptype = (row.protocol_type as ProtocolType) || 'SET';
    const params = (row.protocol_params || {}) as ProtocolParams;
    const hostName = row.exercises?.name || null;

    if (isProtocolType(ptype)) {
      const def = getProtocolDef(ptype);
      const protocolName =
        row.protocol_name ||
        (params as any)?.protocol_name ||
        def.label;

      return {
        kind: 'protocol',
        protocolType: ptype,
        protocolLabel: def.label,
        name: String(protocolName),
        summary: describeExerciseProtocol(ptype, params, row.sets ?? row.prescribed_sets),
        notes: row.notes || (params.note as string | null) || null,
        hostExerciseName: hostName,
        nestedExercises: extractNestedExercises(params),
        paramsLines: buildProtocolParamLines(ptype, params),
      };
    }

    const setsCount = row.sets ?? row.prescribed_sets ?? 1;
    const repsMin = row.reps_min ?? row.prescribed_reps_min ?? null;
    const repsMax = row.reps_max ?? row.prescribed_reps_max ?? null;

    return {
      kind: 'exercise',
      name: hostName || 'Esercizio',
      category: row.exercises?.category ?? null,
      muscles: row.exercises?.muscle_groups ?? undefined,
      tempo: row.tempo ?? null,
      notes: row.notes ?? null,
      sets: toSetRowsFromSetsData(row.sets_data, {
        sets: setsCount,
        reps_min: repsMin,
        reps_max: repsMax,
        rest_seconds: row.rest_seconds ?? null,
        prescribed_duration_seconds: row.prescribed_duration_seconds ?? null,
        prescribed_weight: row.prescribed_weight ?? null,
      }),
    };
  });
}
