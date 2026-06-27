// =====================================================
// PT CATALOG — lettura aggregata per Assistente assegnazioni
// Solo entità già presenti nel database del Personal Trainer.
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { getAthleteDisplayName } from '@/lib/athleteName';
import { listPrograms } from '@/lib/api/programs';
import { getProtocolDef } from '@/lib/protocols/registry';

export type CatalogAthlete = {
  id: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
};

export type CatalogProgramSchedule = {
  orderIndex: number;
  templateId: string;
  templateTitle: string;
};

export type CatalogProgram = {
  id: string;
  name: string;
  description: string | null;
  durationWeeks: number;
  frequencyPerWeek: number;
  activeDays: number[];
  mode: 'recurring' | 'day_by_day';
  schedules: CatalogProgramSchedule[];
};

export type CatalogTemplate = {
  id: string;
  title: string;
  difficultyLevel: string | null;
  estimatedDuration: number | null;
  muscleGroups: string[];
  exerciseCount: number;
};

export type CatalogTemplateExercise = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  orderIndex: number;
  sets: number;
  repsMin: number | null;
  repsMax: number | null;
  restSeconds: number | null;
  protocolType: string;
  protocolLabel: string;
  protocolParams: Record<string, unknown>;
  blockId: string | null;
};

export type CatalogExercise = {
  id: string;
  name: string;
  muscleGroups: string[];
};

export type PTCatalog = {
  athletes: CatalogAthlete[];
  programs: CatalogProgram[];
  templates: CatalogTemplate[];
  exercises: CatalogExercise[];
};

export async function loadPTCatalog(ptUserId: string): Promise<PTCatalog> {
  const [connectionsRes, templatesRes, programsRaw, exercisesRes] = await Promise.all([
    supabase
      .from('pt_atleta_connections')
      .select('atleta_user_id')
      .eq('pt_user_id', ptUserId)
      .eq('status', 'active'),
    supabase
      .from('workout_templates')
      .select(`
        id, title, difficulty_level, estimated_duration, muscle_groups,
        template_exercises (id)
      `)
      .eq('pt_user_id', ptUserId)
      .order('title'),
    listPrograms(ptUserId),
    supabase
      .from('exercises')
      .select('id, name, muscle_groups')
      .eq('created_by', ptUserId)
      .order('name'),
  ]);

  if (connectionsRes.error) throw connectionsRes.error;
  if (templatesRes.error) throw templatesRes.error;
  if (exercisesRes.error) throw exercisesRes.error;

  const athleteIds = (connectionsRes.data || []).map((c) => c.atleta_user_id);
  let athletes: CatalogAthlete[] = [];

  if (athleteIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, email, avatar_url')
      .in('user_id', athleteIds);
    if (profilesError) throw profilesError;

    athletes = (profiles || [])
      .map((p) => ({
        id: p.user_id,
        displayName: getAthleteDisplayName(p.first_name, p.last_name, p.email),
        email: p.email,
        avatarUrl: p.avatar_url,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'it'));
  }

  const programs: CatalogProgram[] = (programsRaw || []).map((p: any) => {
    const schedules = ((p.program_schedules || []) as any[])
      .slice()
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map((s) => ({
        orderIndex: s.order_index ?? 0,
        templateId: s.template_id as string,
        templateTitle: '',
      }));

    return {
      id: p.id as string,
      name: p.name as string,
      description: (p.description as string | null) ?? null,
      durationWeeks: (p.duration_weeks as number) ?? 4,
      frequencyPerWeek: (p.frequency_per_week as number) ?? 3,
      activeDays: ((p.active_days as number[]) || []).slice().sort(),
      mode: ((p.mode as string) || 'recurring') as 'recurring' | 'day_by_day',
      schedules,
    };
  });

  const templates: CatalogTemplate[] = (templatesRes.data || []).map((t: any) => ({
    id: t.id,
    title: t.title,
    difficultyLevel: t.difficulty_level,
    estimatedDuration: t.estimated_duration,
    muscleGroups: (t.muscle_groups as string[]) || [],
    exerciseCount: t.template_exercises?.length || 0,
  }));

  const titleById = new Map(templates.map((t) => [t.id, t.title]));
  for (const program of programs) {
    for (const sch of program.schedules) {
      sch.templateTitle = titleById.get(sch.templateId) || 'Scheda';
    }
  }

  const exercises: CatalogExercise[] = (exercisesRes.data || []).map((e) => ({
    id: e.id,
    name: e.name,
    muscleGroups: (e.muscle_groups as string[]) || [],
  }));

  return { athletes, programs, templates, exercises };
}

export async function loadTemplateExercises(templateId: string): Promise<CatalogTemplateExercise[]> {
  const { data, error } = await supabase
    .from('template_exercises')
    .select(`
      id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds,
      protocol_type, protocol_params, block_id,
      exercises ( id, name )
    `)
    .eq('template_id', templateId)
    .order('order_index');

  if (error) throw error;

  return (data || []).map((te: any) => {
    const protocolType = (te.protocol_type as string) || 'SET';
    return {
      id: te.id as string,
      exerciseId: te.exercise_id as string,
      exerciseName: te.exercises?.name ?? 'Esercizio',
      orderIndex: te.order_index as number,
      sets: te.sets as number,
      repsMin: te.reps_min,
      repsMax: te.reps_max,
      restSeconds: te.rest_seconds,
      protocolType,
      protocolLabel: getProtocolDef(protocolType as any).label,
      protocolParams: (te.protocol_params as Record<string, unknown>) ?? {},
      blockId: (te.block_id as string | null) ?? null,
    };
  });
}
