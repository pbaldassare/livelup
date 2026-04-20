// =====================================================
// API: Gestione Programmi di allenamento
// Programma = insieme ordinato di Schede su un periodo
// Le schede vengono assegnate in ROTAZIONE CICLICA continua
// (es. A→B→C→A→B…) sui giorni attivi della settimana.
// Lo stato della rotazione (current_index) è persistente
// sull'assegnazione e NON si resetta tra settimane.
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { createWorkout } from './workouts';

export type ProgramMode = 'recurring' | 'day_by_day';

export type WorkoutProgram = {
  id: string;
  pt_user_id: string;
  name: string;
  description: string | null;
  duration_weeks: number;
  frequency_per_week: number;
  active_days: number[];
  mode: ProgramMode;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type ProgramSchedule = {
  id: string;
  program_id: string;
  template_id: string;
  day_of_week: number | null; // legacy
  week_offset: number; // 0 = sempre presente nella rotazione
  order_index: number; // ORDINE NELLA ROTAZIONE (A=0, B=1, C=2…)
  day_offset: number | null; // SOLO day_by_day: offset in giorni dalla data inizio assegnazione
};

export type ProgramScheduleInput = {
  id?: string; // se presente → UPDATE esistente, altrimenti INSERT nuovo
  template_id: string;
  day_of_week?: number;
  week_offset?: number;
  order_index?: number;
  day_offset?: number; // per day_by_day
};

// ----------------------- Programmi -----------------------

export async function listPrograms(ptUserId: string) {
  const { data, error } = await supabase
    .from('workout_programs')
    .select('*, program_schedules(id, template_id, day_of_week, week_offset, order_index, day_offset)')
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
        id, template_id, day_of_week, week_offset, order_index, day_offset,
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
  activeDays: number[]; // 1=Lun..7=Dom (per recurring; per day_by_day può essere [])
  notes?: string;
  schedules: ProgramScheduleInput[]; // ordine = order_index = posizione in rotazione
  mode?: ProgramMode; // default 'recurring'
}) {
  const mode: ProgramMode = params.mode ?? 'recurring';

  if (!params.schedules || params.schedules.length === 0) {
    throw new Error('Aggiungi almeno una scheda al programma');
  }
  if (mode === 'recurring' && (!params.activeDays || params.activeDays.length === 0)) {
    throw new Error('Seleziona almeno un giorno di allenamento');
  }
  if (mode === 'day_by_day') {
    // ogni schedule deve avere day_offset valido
    const invalid = params.schedules.some(
      (s) => s.day_offset === undefined || s.day_offset === null || s.day_offset < 0,
    );
    if (invalid) {
      throw new Error('Ogni giorno del programma Day by Day deve avere un offset valido');
    }
  }

  const { data: program, error } = await supabase
    .from('workout_programs')
    .insert({
      pt_user_id: params.ptUserId,
      name: params.name,
      description: params.description ?? null,
      duration_weeks: params.durationWeeks,
      frequency_per_week: params.frequencyPerWeek,
      active_days: mode === 'recurring' ? params.activeDays : [],
      mode,
      notes: params.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  const scheduleRows = params.schedules.map((s, i) => ({
    program_id: program.id,
    template_id: s.template_id,
    day_of_week: mode === 'day_by_day' ? null : (s.day_of_week ?? 1),
    week_offset: s.week_offset ?? 0,
    order_index: i,
    day_offset: mode === 'day_by_day' ? (s.day_offset ?? i) : null,
  }));

  const { error: scheduleError } = await supabase
    .from('program_schedules')
    .insert(scheduleRows);

  if (scheduleError) {
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
    active_days: number[];
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
  mode: ProgramMode = 'recurring',
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
    day_of_week: mode === 'day_by_day' ? null : (s.day_of_week ?? 1),
    week_offset: s.week_offset ?? 0,
    order_index: i,
    day_offset: mode === 'day_by_day' ? (s.day_offset ?? i) : null,
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

  const mode: ProgramMode = ((original as any).mode as ProgramMode) ?? 'recurring';

  const sortedSchedules = [...((original as any).program_schedules || [])].sort(
    (a: any, b: any) => a.order_index - b.order_index,
  );
  const schedules: ProgramScheduleInput[] = sortedSchedules.map((s: any, i: number) => ({
    template_id: s.template_id,
    day_of_week: s.day_of_week,
    week_offset: s.week_offset,
    order_index: s.order_index ?? i,
    day_offset: s.day_offset ?? undefined,
  }));

  return createProgram({
    ptUserId,
    name: `${original.name} (Copia)`,
    description: original.description ?? undefined,
    durationWeeks: original.duration_weeks,
    frequencyPerWeek: original.frequency_per_week,
    activeDays: (original as any).active_days ?? [1, 3, 5],
    notes: original.notes ?? undefined,
    schedules,
    mode,
  });
}

// ----------------------- Assegnazioni / Rotazione -----------------------

/**
 * Calcola le date attive (in ordine cronologico) dentro una finestra di settimane.
 * - startDate: prima data attiva (sempre inclusa, anche se non rientra in active_days)
 * - activeDays: ISO 1..7 (Lun..Dom)
 * - fromWeek/toWeek: finestra in settimane dall'inizio assegnazione
 *
 * Regola critica: il PRIMO giorno è SEMPRE startDate, prende la prima scheda.
 */
function computeActiveDates(
  startDate: Date,
  activeDays: number[],
  fromWeek: number,
  toWeek: number,
): Date[] {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const result: Date[] = [];

  // Settimane: itera giorno per giorno e tieni quelli attivi
  const windowStart = new Date(start);
  windowStart.setDate(windowStart.getDate() + fromWeek * 7);
  const windowEnd = new Date(start);
  windowEnd.setDate(windowEnd.getDate() + toWeek * 7);

  // Costruiamo prima la sequenza globale dall'inizio dell'assegnazione fino a windowEnd
  // così l'indice è coerente, poi filtriamo dalla windowStart in poi.
  const globalSequence: Date[] = [];

  // Garantiamo che startDate sia sempre il primo elemento (anche se non in active_days)
  globalSequence.push(new Date(start));

  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() + 1);
  while (cursor < windowEnd) {
    const jsDay = cursor.getDay(); // 0=Dom..6=Sab
    const isoDay = jsDay === 0 ? 7 : jsDay;
    if (activeDays.includes(isoDay)) {
      globalSequence.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  // Filtra solo le date dentro la finestra richiesta
  for (const d of globalSequence) {
    if (d >= windowStart && d < windowEnd) result.push(d);
  }

  return result;
}

/**
 * Calcola quante date attive esistono dall'inizio fino (esclusivo) a fromWeek.
 * Serve per sapere quale dovrebbe essere current_index "atteso" se si rigenerasse
 * tutto da zero. Usato come safety se assignment.current_index non è coerente.
 */
function countActiveDatesBefore(
  startDate: Date,
  activeDays: number[],
  beforeWeek: number,
): number {
  if (beforeWeek <= 0) return 0;
  const fakeEnd = new Date(startDate);
  fakeEnd.setDate(fakeEnd.getDate() + beforeWeek * 7);
  const sequence = computeActiveDates(startDate, activeDays, 0, beforeWeek);
  return sequence.length;
}

/**
 * Genera workouts per la finestra [fromWeek, toWeek) usando rotazione ciclica.
 * - Le schede vengono prese in ordine ciclico A→B→C→A… per ogni data attiva.
 * - current_index parte da `startIndex` (di solito = assignment.current_index).
 * - Salta date già occupate (stesso atleta + stesso titolo o stesso template_id).
 * - Ritorna anche il NUOVO indice da persistere.
 */
async function generateRotationWorkouts(params: {
  ptUserId: string;
  atletaUserId: string;
  programId: string;
  startDate: Date;
  activeDays: number[];
  fromWeek: number;
  toWeek: number;
  startIndex: number;
}) {
  const {
    ptUserId,
    atletaUserId,
    programId,
    startDate,
    activeDays,
    fromWeek,
    toWeek,
    startIndex,
  } = params;

  const program = await getProgram(programId);
  if (!program) throw new Error('Programma non trovato');

  // Schede ordinate per order_index → la sequenza ciclica
  const sortedSchedules = [...((program as any).program_schedules || [])].sort(
    (a: any, b: any) => a.order_index - b.order_index,
  );
  if (sortedSchedules.length === 0) {
    return { created: 0, skipped: 0, newIndex: startIndex };
  }

  const dates = computeActiveDates(startDate, activeDays, fromWeek, toWeek);
  if (dates.length === 0) {
    return { created: 0, skipped: 0, newIndex: startIndex };
  }

  // Pre-fetch workouts esistenti nella finestra per skip duplicati
  const windowStart = dates[0];
  const windowEndDate = new Date(dates[dates.length - 1]);
  windowEndDate.setDate(windowEndDate.getDate() + 1);

  const { data: existing } = await supabase
    .from('workouts')
    .select('scheduled_date, title, template_id')
    .eq('atleta_user_id', atletaUserId)
    .eq('pt_user_id', ptUserId)
    .gte('scheduled_date', windowStart.toISOString())
    .lt('scheduled_date', windowEndDate.toISOString());

  const existingKeys = new Set(
    (existing || []).map(
      (w: any) =>
        `${w.template_id ?? ''}__${
          w.scheduled_date ? w.scheduled_date.slice(0, 10) : ''
        }`,
    ),
  );

  let created = 0;
  let skipped = 0;
  let index = ((startIndex % sortedSchedules.length) + sortedSchedules.length) %
    sortedSchedules.length;

  for (const date of dates) {
    const sch = sortedSchedules[index];
    const dateKey = date.toISOString().slice(0, 10);
    const dedupeKey = `${sch.template_id}__${dateKey}`;

    if (existingKeys.has(dedupeKey)) {
      skipped++;
      // ⚠️ avanziamo comunque l'indice per mantenere la rotazione coerente,
      // come se la scheda fosse stata "consumata" (lo era già)
      index = (index + 1) % sortedSchedules.length;
      continue;
    }

    // Carica esercizi del template
    const { data: tex } = await supabase
      .from('template_exercises')
      .select('*')
      .eq('template_id', sch.template_id)
      .order('order_index');

    const scheduledISO = new Date(date);
    scheduledISO.setHours(0, 0, 0, 0);

    await createWorkout({
      atletaUserId,
      ptUserId,
      title: sch.workout_templates?.title ?? 'Allenamento',
      templateId: sch.template_id,
      scheduledDate: scheduledISO.toISOString(),
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
    index = (index + 1) % sortedSchedules.length;
  }

  return { created, skipped, newIndex: index };
}

/**
 * Wrapper principale: in base al `mode` del programma, instrada
 * verso la logica ricorrente (rotazione) o quella day_by_day (date specifiche).
 */
export async function assignProgramToAthlete(params: {
  ptUserId: string;
  atletaUserId: string;
  programId: string;
  startDate: Date;
  activeDays?: number[]; // override; default = program.active_days (solo recurring)
}) {
  const { ptUserId, atletaUserId, programId, startDate } = params;

  const program = await getProgram(programId);
  if (!program) throw new Error('Programma non trovato');
  const schedules = ((program as any).program_schedules || []) as any[];
  if (schedules.length === 0) {
    throw new Error('Il programma non contiene schede');
  }

  const mode: ProgramMode = ((program as any).mode as ProgramMode) ?? 'recurring';

  if (mode === 'day_by_day') {
    return assignDayByDayProgram({
      ptUserId,
      atletaUserId,
      programId,
      startDate,
    });
  }

  return assignRecurringProgram({
    ptUserId,
    atletaUserId,
    programId,
    startDate,
    activeDays: params.activeDays,
  });
}

/**
 * Assegnazione MODALITÀ RICORRENTE (rotazione ciclica).
 */
async function assignRecurringProgram(params: {
  ptUserId: string;
  atletaUserId: string;
  programId: string;
  startDate: Date;
  activeDays?: number[];
}) {
  const { ptUserId, atletaUserId, programId, startDate } = params;

  const program = await getProgram(programId);
  if (!program) throw new Error('Programma non trovato');

  const activeDays =
    params.activeDays && params.activeDays.length > 0
      ? params.activeDays
      : ((program as any).active_days as number[]) ?? [1, 3, 5];

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + program.duration_weeks * 7 - 1);

  const { data: assignment, error } = await supabase
    .from('program_assignments')
    .insert({
      program_id: programId,
      pt_user_id: ptUserId,
      atleta_user_id: atletaUserId,
      start_date: startDate.toISOString().slice(0, 10),
      end_date: endDate.toISOString().slice(0, 10),
      weeks_generated: 0,
      current_index: 0,
      active_days: activeDays,
      status: 'active',
    })
    .select()
    .single();
  if (error) throw error;

  // Genera prima settimana subito (rotazione parte da 0)
  const weeksToGenerate = Math.min(1, program.duration_weeks);
  const result = await generateRotationWorkouts({
    ptUserId,
    atletaUserId,
    programId,
    startDate,
    activeDays,
    fromWeek: 0,
    toWeek: weeksToGenerate,
    startIndex: 0,
  });

  await supabase
    .from('program_assignments')
    .update({
      weeks_generated: weeksToGenerate,
      current_index: result.newIndex,
    })
    .eq('id', assignment.id);

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
 * Assegnazione MODALITÀ DAY BY DAY.
 * Genera workouts puntuali su date assolute = startDate + day_offset.
 * NESSUNA rotazione, NESSUN rolling, NESSUN current_index.
 */
async function assignDayByDayProgram(params: {
  ptUserId: string;
  atletaUserId: string;
  programId: string;
  startDate: Date;
}) {
  const { ptUserId, atletaUserId, programId, startDate } = params;

  const program = await getProgram(programId);
  if (!program) throw new Error('Programma non trovato');
  const schedules = (((program as any).program_schedules || []) as any[]).filter(
    (s) => s.day_offset !== null && s.day_offset !== undefined,
  );
  if (schedules.length === 0) {
    throw new Error('Il programma Day by Day non contiene giorni programmati');
  }

  // Ordina per offset crescente
  schedules.sort((a, b) => (a.day_offset ?? 0) - (b.day_offset ?? 0));

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  // End date = startDate + max(day_offset)
  const maxOffset = Math.max(...schedules.map((s) => s.day_offset ?? 0));
  const endDate = new Date(start);
  endDate.setDate(endDate.getDate() + maxOffset);

  // Crea assignment (current_index resta 0, non significativo)
  const { data: assignment, error } = await supabase
    .from('program_assignments')
    .insert({
      program_id: programId,
      pt_user_id: ptUserId,
      atleta_user_id: atletaUserId,
      start_date: start.toISOString().slice(0, 10),
      end_date: endDate.toISOString().slice(0, 10),
      weeks_generated: Math.ceil((maxOffset + 1) / 7),
      current_index: 0,
      active_days: [],
      status: 'active',
    })
    .select()
    .single();
  if (error) throw error;

  // Pre-fetch workouts esistenti nelle date target per skip duplicati
  const targetDates = schedules.map((s) => {
    const d = new Date(start);
    d.setDate(d.getDate() + (s.day_offset ?? 0));
    return d;
  });
  const minDate = targetDates[0];
  const maxDate = new Date(targetDates[targetDates.length - 1]);
  maxDate.setDate(maxDate.getDate() + 1);

  const { data: existing } = await supabase
    .from('workouts')
    .select('scheduled_date, template_id')
    .eq('atleta_user_id', atletaUserId)
    .eq('pt_user_id', ptUserId)
    .gte('scheduled_date', minDate.toISOString())
    .lt('scheduled_date', maxDate.toISOString());

  const existingKeys = new Set(
    (existing || []).map(
      (w: any) =>
        `${w.template_id ?? ''}__${
          w.scheduled_date ? w.scheduled_date.slice(0, 10) : ''
        }`,
    ),
  );

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < schedules.length; i++) {
    const sch = schedules[i];
    const targetDate = targetDates[i];
    const dateKey = targetDate.toISOString().slice(0, 10);
    const dedupeKey = `${sch.template_id}__${dateKey}`;

    if (existingKeys.has(dedupeKey)) {
      skipped++;
      continue;
    }

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
      scheduledDate: targetDate.toISOString(),
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

  await supabase.from('notifications').insert({
    user_id: atletaUserId,
    type: 'program_assigned',
    title: 'Nuovo programma di allenamento!',
    body: `Il tuo Coach ti ha assegnato il programma "${program.name}"`,
    action_url: '/app/scheda',
    data: { pt_user_id: ptUserId, program_id: programId },
  });

  return { assignment, created, skipped, newIndex: 0 };
}

/**
 * Genera la prossima settimana per un'assegnazione attiva.
 * Idempotente: salta i workout già esistenti.
 * Continua la rotazione dall'indice salvato (NIENTE reset).
 */
export async function rollProgramAssignment(assignmentId: string) {
  const { data: assignment, error } = await supabase
    .from('program_assignments')
    .select('*, workout_programs:program_id (id, duration_weeks, active_days, mode)')
    .eq('id', assignmentId)
    .single();
  if (error) throw error;
  if (!assignment) return { created: 0, skipped: 0 };

  const program = (assignment as any).workout_programs;
  if (!program) return { created: 0, skipped: 0 };
  if (assignment.status !== 'active') return { created: 0, skipped: 0 };
  // I programmi day_by_day generano TUTTI i workouts in fase di assegnazione.
  // Niente rolling per loro.
  if (program.mode === 'day_by_day') return { created: 0, skipped: 0 };
  if (assignment.weeks_generated >= program.duration_weeks) {
    return { created: 0, skipped: 0 };
  }

  const nextWeek = assignment.weeks_generated;
  const activeDays =
    (assignment as any).active_days ?? program.active_days ?? [1, 3, 5];

  const result = await generateRotationWorkouts({
    ptUserId: assignment.pt_user_id,
    atletaUserId: assignment.atleta_user_id,
    programId: assignment.program_id,
    startDate: new Date(assignment.start_date),
    activeDays,
    fromWeek: nextWeek,
    toWeek: nextWeek + 1,
    startIndex: (assignment as any).current_index ?? 0,
  });

  await supabase
    .from('program_assignments')
    .update({
      weeks_generated: nextWeek + 1,
      current_index: result.newIndex,
    })
    .eq('id', assignmentId);

  return { created: result.created, skipped: result.skipped };
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

/**
 * Costruisce una rappresentazione leggibile della rotazione: A → B → C → A...
 */
export function describeRotation(
  schedules: { order_index: number; workout_templates?: { title?: string } | null }[],
  cycles = 2,
): string {
  if (!schedules || schedules.length === 0) return '';
  const sorted = [...schedules].sort((a, b) => a.order_index - b.order_index);
  const labels = sorted.map(
    (s, i) => s.workout_templates?.title ?? `Scheda ${i + 1}`,
  );
  const seq: string[] = [];
  for (let c = 0; c < cycles; c++) seq.push(...labels);
  return seq.join(' → ') + ' → …';
}
