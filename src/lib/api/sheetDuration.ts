// =====================================================
// API: durata calcolata di schede (template) e allenamenti assegnati.
// Legge le righe esercizio/protocollo e le passa a workoutDuration.
// `workout_templates.estimated_duration` (minuti) è solo una cache
// del valore calcolato, per i lettori che non ricalcolano.
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import {
  estimateRoutineExerciseListSeconds,
  estimateSheetDuration,
  secondsToRoundedMinutes,
  type DurationExerciseRow,
  type SheetDuration,
} from '@/lib/workoutDuration';
import { resolveRoutineExerciseIds } from '@/lib/pt/routineExercises';

export const TEMPLATE_DURATION_FIELDS =
  'template_id, order_index, sets, reps_min, reps_max, rest_seconds, prescribed_duration_seconds, sets_data, protocol_type, protocol_params, tempo';

const WORKOUT_DURATION_FIELDS =
  'workout_id, order_index, prescribed_sets, prescribed_reps_min, prescribed_reps_max, rest_seconds, prescribed_duration_seconds, sets_data, protocol_type, protocol_params';

type RowWithParent = DurationExerciseRow & { order_index?: number | null };

function groupSorted<T extends RowWithParent>(rows: T[], key: keyof T): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const id = row[key] as unknown as string;
    if (!id) continue;
    const list = map.get(id) ?? [];
    list.push(row);
    map.set(id, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }
  return map;
}

/** Durata principale (secondi) per più template in una sola query. */
export async function fetchTemplateDurations(templateIds: string[]): Promise<Record<string, number>> {
  const ids = [...new Set(templateIds.filter(Boolean))];
  if (!ids.length) return {};
  const { data, error } = await supabase
    .from('template_exercises')
    .select(TEMPLATE_DURATION_FIELDS)
    .in('template_id', ids);
  if (error) throw error;
  const grouped = groupSorted((data || []) as Array<RowWithParent & { template_id: string }>, 'template_id');
  const out: Record<string, number> = {};
  for (const id of ids) {
    out[id] = estimateSheetDuration(grouped.get(id) ?? []).mainSeconds;
  }
  return out;
}

/** Durata per più allenamenti assegnati (warmup/cooldown separati). */
export async function fetchWorkoutDurations(workoutIds: string[]): Promise<Record<string, SheetDuration>> {
  const ids = [...new Set(workoutIds.filter(Boolean))];
  if (!ids.length) return {};
  let res = await supabase
    .from('workout_exercises')
    .select(`${WORKOUT_DURATION_FIELDS}, phase`)
    .in('workout_id', ids);
  if (res.error && /phase|42703|PGRST204|schema cache/i.test(res.error.message)) {
    res = (await supabase
      .from('workout_exercises')
      .select(WORKOUT_DURATION_FIELDS)
      .in('workout_id', ids)) as typeof res;
  }
  if (res.error) throw res.error;
  const grouped = groupSorted((res.data || []) as Array<RowWithParent & { workout_id: string }>, 'workout_id');
  const out: Record<string, SheetDuration> = {};
  for (const id of ids) out[id] = estimateSheetDuration(grouped.get(id) ?? []);
  return out;
}

export interface TemplateRoutineRefs {
  include_warmup?: boolean | null;
  include_cooldown?: boolean | null;
  warmup_template_id?: string | null;
  cooldown_template_id?: string | null;
  warmup_exercise_id?: string | null;
  cooldown_exercise_id?: string | null;
  warmup_exercise_ids?: unknown;
  cooldown_exercise_ids?: unknown;
}

/**
 * Durata completa di un template: principale + riscaldamento/stretching
 * collegati (stessa risoluzione di templateLoader: lista esercizi → template).
 */
export async function fetchTemplateSheetDuration(
  templateId: string,
  refs: TemplateRoutineRefs = {},
): Promise<SheetDuration> {
  const warmupIds = refs.include_warmup
    ? resolveRoutineExerciseIds({ exerciseIds: refs.warmup_exercise_ids, exerciseId: refs.warmup_exercise_id })
    : [];
  const cooldownIds = refs.include_cooldown
    ? resolveRoutineExerciseIds({ exerciseIds: refs.cooldown_exercise_ids, exerciseId: refs.cooldown_exercise_id })
    : [];
  const warmupTpl = refs.include_warmup && !warmupIds.length ? refs.warmup_template_id ?? null : null;
  const cooldownTpl = refs.include_cooldown && !cooldownIds.length ? refs.cooldown_template_id ?? null : null;

  const durations = await fetchTemplateDurations(
    [templateId, warmupTpl, cooldownTpl].filter((id): id is string => !!id),
  );

  return {
    mainSeconds: durations[templateId] ?? 0,
    warmupSeconds: warmupIds.length
      ? estimateRoutineExerciseListSeconds(warmupIds.length)
      : warmupTpl
        ? durations[warmupTpl] ?? 0
        : 0,
    cooldownSeconds: cooldownIds.length
      ? estimateRoutineExerciseListSeconds(cooldownIds.length)
      : cooldownTpl
        ? durations[cooldownTpl] ?? 0
        : 0,
  };
}

/** Allinea `estimated_duration` al valore calcolato. Ritorna i minuti scritti. */
export async function persistTemplateEstimatedDuration(
  templateId: string,
  mainSeconds: number,
): Promise<number | null> {
  const minutes = secondsToRoundedMinutes(mainSeconds);
  const { error } = await supabase
    .from('workout_templates')
    .update({ estimated_duration: minutes })
    .eq('id', templateId);
  if (error) throw error;
  return minutes;
}

/** Ricalcola e salva `estimated_duration` (es. dopo creazione da assistente). */
export async function syncTemplateEstimatedDuration(templateId: string): Promise<number | null> {
  const durations = await fetchTemplateDurations([templateId]);
  return persistTemplateEstimatedDuration(templateId, durations[templateId] ?? 0);
}
