// =====================================================
// Carica un template + esercizi/protocolli → WorkoutSheetDto
// =====================================================

import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { templateKindLabel } from '@/lib/pt/templateKinds';
import {
  formatProfileName,
  mapRawRowsToSheetItems,
  type RawSheetExerciseRow,
} from '@/lib/pdf/sheetMappersShared';
import type { WorkoutSheetDto } from '@/lib/pdf/workoutSheetTypes';

async function fetchTemplateExercises(templateId: string): Promise<RawSheetExerciseRow[]> {
  const fullSelect =
    'id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes, tempo, block_id, prescribed_duration_seconds, sets_data, protocol_type, protocol_params, protocol_name, library_protocol_id, exercises (name, category, muscle_groups, instructions)';
  const legacySelect =
    'id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes, tempo, block_id, prescribed_duration_seconds, sets_data, protocol_type, protocol_params, exercises (name, category, muscle_groups, instructions)';

  const first = await supabase
    .from('template_exercises')
    .select(fullSelect)
    .eq('template_id', templateId)
    .order('order_index');

  if (!first.error) return (first.data || []) as unknown as RawSheetExerciseRow[];

  if (/protocol_name|library_protocol_id|42703|PGRST204|schema cache/i.test(first.error.message)) {
    const legacy = await supabase
      .from('template_exercises')
      .select(legacySelect)
      .eq('template_id', templateId)
      .order('order_index');
    if (legacy.error) throw legacy.error;
    return (legacy.data || []) as unknown as RawSheetExerciseRow[];
  }

  throw first.error;
}

export async function mapTemplateToSheet(templateId: string): Promise<WorkoutSheetDto> {
  const { data: template, error: tplErr } = await supabase
    .from('workout_templates')
    .select(
      'id, title, description, difficulty_level, template_kind, include_warmup, include_cooldown, pt_user_id, updated_at, created_at',
    )
    .eq('id', templateId)
    .single();

  if (tplErr) throw tplErr;
  if (!template) throw new Error('Template non trovato');

  const [exerciseRows, profileRes] = await Promise.all([
    fetchTemplateExercises(templateId),
    supabase
      .from('profiles')
      .select('first_name, last_name, nickname')
      .eq('user_id', template.pt_user_id)
      .maybeSingle(),
  ]);

  const items = mapRawRowsToSheetItems(exerciseRows);
  if (items.length === 0) {
    throw new Error('Scheda vuota: aggiungi almeno un esercizio prima di esportare');
  }

  const level =
    template.difficulty_level && template.difficulty_level !== 'nessuno'
      ? template.difficulty_level
      : null;

  const dateSource = template.updated_at || template.created_at;
  const dateLabel = dateSource
    ? format(new Date(dateSource), 'dd MMMM yyyy', { locale: it })
    : null;

  return {
    title: template.title,
    ptName: formatProfileName(profileRes.data),
    dateLabel,
    kindLabel: templateKindLabel((template as any).template_kind),
    levelLabel: level,
    description: template.description,
    includeWarmup: !!(template as any).include_warmup,
    includeCooldown: !!(template as any).include_cooldown,
    items,
    source: 'template',
  };
}
