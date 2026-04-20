// =====================================================
// API: Gestione Programmi di allenamento
// Programma = insieme ordinato di Schede su un periodo
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { createWorkout } from './workouts';

export type WorkoutProgram = {
  id: string;
  pt_user_id: string;
  name: string;
  description: string | null;
  duration_weeks: number;
  frequency_per_week: number;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type ProgramSchedule = {
  id: string;
  program_id: string;
  template_id: string;
  day_of_week: number; // 1=Lun ... 7=Dom
  week_offset: number; // 0 = ripeti ogni settimana
  order_index: number;
};

export type ProgramScheduleInput = {
  template_id: string;
  day_of_week: number;
  week_offset?: number;
  order_index?: number;
};

// ----------------------- Programmi -----------------------

export async function listPrograms(ptUserId: string) {
  const { data, error } = await supabase
    .from('workout_programs')
    .select('*, program_schedules(id, template_id, day_of_week, week_offset, order_index)')
    .eq('pt_user_id', ptUserId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getProgram(programId: string) {
  const { data, error } = await supabase
    .from('workout_programs')
    .select(
      `*, program_schedules(
        id, template_id, day_of_week, week_offset, order_index,
        workout_templates:template_id (id, title, difficulty_level, estimated_duration)
      )`,
    )
    .eq('id', programId)
    .single();
  if (error) throw error;
  return data;
}

export async function createProgram(params: {
  ptUserId: string;
  name: string;
  description?: string;
  durationWeeks: number;
  frequencyPerWeek: number;
  notes?: string;
  schedules: ProgramScheduleInput[];
}) {
  if (!params.schedules || params.schedules.length === 0) {
    throw new Error('Aggiungi almeno una scheda al programma');
  }

  const { data: program, error } = await supabase
    .from('workout_programs')
    .insert({
      pt_user_id: params.ptUserId,
      name: params.name,
      description: params.description ?? null,
      duration_weeks: params.durationWeeks,
      frequency_per_week: params.frequencyPerWeek,
      notes: params.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  const scheduleRows = params.schedules.map((s, i) => ({
    program_id: program.id,
    template_id: s.template_id,
    day_of_week: s.day_of_week,
    week_offset: s.week_offset ?? 0,
    order_index: s.order_index ?? i,
  }));

  const { error: scheduleError } = await supabase
    .from('program_schedules')
    .insert(scheduleRows);

  if (scheduleError) {
    // rollback
    await supabase.from('workout_programs').delete().eq('id', program.id);
    throw scheduleError;
  }

  return program;
}

export async function updateProgram(
  programId: string,
  updates: Partial<{
    name: string;
    description: string | null;
    duration_weeks: number;
    frequency_per_week: number;
    notes: string | null;
  }>,
) {
  const { error } = await supabase
    .from('workout_programs')
    .update(updates)
    .eq('id', programId);
  if (error) throw error;
}

export async function replaceProgramSchedules(
  programId: string,
  schedules: ProgramScheduleInput[],
) {
  if (!schedules || schedules.length === 0) {
    throw new Error('Il programma deve contenere almeno una scheda');
  }
  const { error: delErr } = await supabase
    .from('program_schedules')
    .delete()
    .eq('program_id', programId);
  if (delErr) throw delErr;

  const rows = schedules.map((s, i) => ({
    program_id: programId,
    template_id: s.template_id,
    day_of_week: s.day_of_week,
    week_offset: s.week_offset ?? 0,
    order_index: s.order_index ?? i,
  }));
  const { error } = await supabase.from('program_schedules').insert(rows);
  if (error) throw error;
}

export async function deleteProgram(programId: string) {
  const { error } = await supabase
    .from('workout_programs')
    .delete()
    .eq('id', programId);
  if (error) throw error;
}

export async function duplicateProgram(programId: string, ptUserId: string) {
  const original = await getProgram(programId);
  if (!original) throw new Error('Programma non trovato');

  const schedules: ProgramScheduleInput[] = (original.program_schedules || []).map(
    (s: any) => ({
      template_id: s.template_id,
      day_of_week: s.day_of_week,
      week_offset: s.week_offset,
      order_index: s.order_index,
    }),
  );

  return createProgram({
    ptUserId,
    name: `${original.name} (Copia)`,
    description: original.description ?? undefined,
    durationWeeks: original.duration_weeks,
    frequencyPerWeek: original.frequency_per_week,
    notes: original.notes ?? undefined,
    schedules,
  });
}

// ----------------------- Assegnazioni -----------------------

const ISO_WEEKDAY_TO_JS = (iso: number) => (iso === 7 ? 0 : iso); // ISO 1-7 (Lun..Dom) -> JS 0-6 (Dom..Sab)

/**
 * Genera workouts per N settimane a partire da una data.
 * Salta date già occupate (stesso titolo / stesso atleta).
 */
async function generateWorkoutsForWeeks(params: {
  ptUserId: string;
  atletaUserId: string;
  programId: string;
  startDate: Date;
  fromWeek: number; // inclusive (0-indexed)
  toWeek: number; // exclusive
}) {
  const { ptUserId, atletaUserId, programId, startDate, fromWeek, toWeek } = params;

  const program = await getProgram(programId);
  if (!program) throw new Error('Programma non trovato');
  const schedules = (program.program_schedules || []) as any[];
  if (schedules.length === 0) return { created: 0, skipped: 0 };

  // Pre-fetch existing workouts in window
  const windowStart = new Date(startDate);
  windowStart.setDate(windowStart.getDate() + fromWeek * 7);
  const windowEnd = new Date(startDate);
  windowEnd.setDate(windowEnd.getDate() + toWeek * 7);

  const { data: existing } = await supabase
    .from('workouts')
    .select('scheduled_date, title')
    .eq('atleta_user_id', atletaUserId)
    .eq('pt_user_id', ptUserId)
    .gte('scheduled_date', windowStart.toISOString())
    .lt('scheduled_date', windowEnd.toISOString());

  const existingKeys = new Set(
    (existing || []).map(
      (w) => `${w.title}__${w.scheduled_date ? w.scheduled_date.slice(0, 10) : ''}`,
    ),
  );

  let created = 0;
  let skipped = 0;

  for (let week = fromWeek; week < toWeek; week++) {
    for (const sch of schedules) {
      // week_offset 0 = ripeti ogni settimana, altrimenti solo settimana specifica (1-indexed)
      if (sch.week_offset !== 0 && sch.week_offset !== week + 1) continue;

      const targetDate = new Date(startDate);
      targetDate.setHours(0, 0, 0, 0);
      // Allinea a inizio settimana del primo giorno (lunedì della settimana di start)
      const startJsDay = startDate.getDay(); // 0=Dom..6=Sab
      const startISODay = startJsDay === 0 ? 7 : startJsDay; // 1..7
      const daysFromMondayOfStart = startISODay - 1;
      const mondayOfStartWeek = new Date(startDate);
      mondayOfStartWeek.setDate(mondayOfStartWeek.getDate() - daysFromMondayOfStart);
      mondayOfStartWeek.setHours(0, 0, 0, 0);

      const target = new Date(mondayOfStartWeek);
      target.setDate(target.getDate() + week * 7 + (sch.day_of_week - 1));

      // Skip date precedenti alla startDate
      if (target < new Date(startDate.toDateString())) continue;

      const key = `${sch.workout_templates?.title ?? ''}__${target.toISOString().slice(0, 10)}`;
      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }

      // Carica esercizi del template
      const { data: tex } = await supabase
        .from('template_exercises')
        .select('*')
        .eq('template_id', sch.template_id)
        .order('order_index');

      await createWorkout({
        atletaUserId,
        ptUserId,
        title: sch.workout_templates?.title ?? 'Allenamento',
        templateId: sch.template_id,
        scheduledDate: target.toISOString(),
        exercises: (tex || []).map((te) => ({
          exerciseId: te.exercise_id,
          orderIndex: te.order_index,
          prescribedSets: te.sets,
          prescribedRepsMin: te.reps_min ?? undefined,
          prescribedRepsMax: te.reps_max ?? undefined,
          restSeconds: te.rest_seconds ?? undefined,
          notes: te.notes ?? undefined,
        })),
      });
      created++;
    }
  }

  return { created, skipped };
}

export async function assignProgramToAthlete(params: {
  ptUserId: string;
  atletaUserId: string;
  programId: string;
  startDate: Date;
}) {
  const { ptUserId, atletaUserId, programId, startDate } = params;

  const program = await getProgram(programId);
  if (!program) throw new Error('Programma non trovato');
  const schedules = (program.program_schedules || []) as any[];
  if (schedules.length === 0) {
    throw new Error('Il programma non contiene schede');
  }

  // Calcola data fine
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + program.duration_weeks * 7 - 1);

  // Crea assegnazione
  const { data: assignment, error } = await supabase
    .from('program_assignments')
    .insert({
      program_id: programId,
      pt_user_id: ptUserId,
      atleta_user_id: atletaUserId,
      start_date: startDate.toISOString().slice(0, 10),
      end_date: endDate.toISOString().slice(0, 10),
      weeks_generated: 0,
      status: 'active',
    })
    .select()
    .single();
  if (error) throw error;

  // Genera prima settimana subito
  const weeksToGenerate = Math.min(1, program.duration_weeks);
  const result = await generateWorkoutsForWeeks({
    ptUserId,
    atletaUserId,
    programId,
    startDate,
    fromWeek: 0,
    toWeek: weeksToGenerate,
  });

  await supabase
    .from('program_assignments')
    .update({ weeks_generated: weeksToGenerate })
    .eq('id', assignment.id);

  // Notifica atleta
  await supabase.from('notifications').insert({
    user_id: atletaUserId,
    type: 'program_assigned',
    title: 'Nuovo programma di allenamento!',
    body: `Il tuo Coach ti ha assegnato il programma "${program.name}"`,
    action_url: '/app/scheda',
    data: { pt_user_id: ptUserId, program_id: programId },
  });

  return { assignment, ...result };
}

/**
 * Genera la prossima settimana per un'assegnazione attiva.
 * Idempotente: se la settimana esiste già viene saltata.
 */
export async function rollProgramAssignment(assignmentId: string) {
  const { data: assignment, error } = await supabase
    .from('program_assignments')
    .select('*, workout_programs:program_id (id, duration_weeks)')
    .eq('id', assignmentId)
    .single();
  if (error) throw error;
  if (!assignment) return { created: 0, skipped: 0 };

  const program = (assignment as any).workout_programs;
  if (!program) return { created: 0, skipped: 0 };
  if (assignment.status !== 'active') return { created: 0, skipped: 0 };
  if (assignment.weeks_generated >= program.duration_weeks) {
    return { created: 0, skipped: 0 };
  }

  const nextWeek = assignment.weeks_generated;
  const result = await generateWorkoutsForWeeks({
    ptUserId: assignment.pt_user_id,
    atletaUserId: assignment.atleta_user_id,
    programId: assignment.program_id,
    startDate: new Date(assignment.start_date),
    fromWeek: nextWeek,
    toWeek: nextWeek + 1,
  });

  await supabase
    .from('program_assignments')
    .update({ weeks_generated: nextWeek + 1 })
    .eq('id', assignmentId);

  return result;
}

export async function listProgramAssignments(ptUserId: string) {
  const { data, error } = await supabase
    .from('program_assignments')
    .select('*, workout_programs:program_id (name, duration_weeks)')
    .eq('pt_user_id', ptUserId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
