// =====================================================
// PT ASSISTANT — creazione catalogo (esercizio, scheda, protocollo, programma)
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { createProgram, type ProgramMode } from '@/lib/api/programs';
import { getDefaultParamsForProtocol, type ProtocolType } from '@/lib/protocols/registry';
import type {
  CreatePayload,
  ExerciseCreatePayload,
  ProgramCreatePayload,
  ProtocolCreatePayload,
  TemplateCreatePayload,
} from '@/lib/ptAssistantCreateParse';

export async function saveAssistantCreate(ptUserId: string, payload: CreatePayload) {
  switch (payload.intent) {
    case 'exercise':
      return createAssistantExercise({ ptUserId, ...payload });
    case 'template':
      return createAssistantTemplate({ ptUserId, ...payload });
    case 'protocol':
      return configureAssistantProtocol(payload);
    case 'program':
      return createAssistantProgram({ ptUserId, ...payload });
  }
}

async function createAssistantExercise(
  input: ExerciseCreatePayload & { ptUserId: string },
) {
  const { data, error } = await supabase
    .from('exercises')
    .insert({
      name: input.name.trim(),
      category: input.category,
      muscle_groups: input.muscleGroups,
      difficulty_level: input.difficultyLevel as 'nessuno',
      description: input.description,
      instructions: input.instructions,
      video_url: input.videoUrl,
      equipment: input.equipment,
      is_public: input.isPublic,
      created_by: input.ptUserId,
    })
    .select('id, name')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function createAssistantTemplate(
  input: TemplateCreatePayload & { ptUserId: string },
) {
  const { data: template, error } = await supabase
    .from('workout_templates')
    .insert({
      pt_user_id: input.ptUserId,
      title: input.title.trim(),
      description: input.description,
      difficulty_level: input.difficultyLevel as 'nessuno',
      estimated_duration: input.estimatedDuration,
      muscle_groups: input.muscleGroups,
      category: input.category,
      tags: input.tags,
      is_public: false,
    } as any)
    .select('id, title')
    .single();

  if (error) throw new Error(error.message);

  await supabase.from('template_blocks').insert({
    template_id: template.id,
    order_index: 0,
    type: 'SET',
    name: 'Blocco 1',
    params: { sets: 4, reps: 10, rest_seconds: 90 },
  });

  if (input.exerciseIds.length > 0) {
    const rows = input.exerciseIds.map((exerciseId, i) => ({
      template_id: template.id,
      exercise_id: exerciseId,
      order_index: i,
      sets: 3,
      reps_min: 10,
      reps_max: null,
      rest_seconds: 60,
      protocol_type: 'SET',
      protocol_params: {},
    }));
    const { error: exErr } = await supabase.from('template_exercises').insert(rows);
    if (exErr) throw new Error(exErr.message);
  }

  return template;
}

async function configureAssistantProtocol(input: ProtocolCreatePayload) {
  const params = {
    ...getDefaultParamsForProtocol(input.protocolType),
    ...input.protocolParams,
  };

  const { data: existing } = await supabase
    .from('template_exercises')
    .select('id')
    .eq('template_id', input.templateId)
    .eq('exercise_id', input.exerciseId)
    .maybeSingle();

  const row = {
    protocol_type: input.protocolType,
    protocol_params: params,
    sets: input.sets,
    reps_min: input.repsMin,
    reps_max: input.repsMax,
    rest_seconds: input.restSeconds,
    notes: input.notes,
    tempo: input.tempo,
    prescribed_duration_seconds: input.prescribedDurationSeconds,
  };

  if (existing) {
    const { error } = await supabase.from('template_exercises').update(row).eq('id', existing.id);
    if (error) throw new Error(error.message);
    return { templateId: input.templateId, templateExerciseId: existing.id, updated: true };
  }

  const { data: maxRow } = await supabase
    .from('template_exercises')
    .select('order_index')
    .eq('template_id', input.templateId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: inserted, error } = await supabase
    .from('template_exercises')
    .insert({
      template_id: input.templateId,
      exercise_id: input.exerciseId,
      order_index: (maxRow?.order_index ?? -1) + 1,
      ...row,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return { templateId: input.templateId, templateExerciseId: inserted.id, updated: false };
}

async function createAssistantProgram(
  input: ProgramCreatePayload & { ptUserId: string },
) {
  return createProgram({
    ptUserId: input.ptUserId,
    name: input.name.trim(),
    description: input.description ?? undefined,
    notes: input.notes ?? undefined,
    durationWeeks: input.durationWeeks,
    frequencyPerWeek: input.activeDays.length,
    activeDays: input.activeDays,
    schedules: input.templateIds.map((template_id) => ({ template_id })),
    mode: input.mode as ProgramMode,
  });
}

export type { ProtocolType };
