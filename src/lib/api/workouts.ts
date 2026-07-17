// =====================================================
// API: Gestione Allenamenti
// CRUD workout e log
// =====================================================

import { supabase } from '@/integrations/supabase/client';

// =====================================================
// CREA WORKOUT
// =====================================================

export async function createWorkout(params: {
  atletaUserId: string;
  ptUserId: string;
  title: string;
  description?: string;
  templateId?: string;
  templateKind?: 'libera' | 'propedeutica' | 'progressiva';
  scheduledDate?: string;
  dueDate?: string;
  exercises: Array<{
    exerciseId: string;
    orderIndex: number;
    prescribedSets: number;
    prescribedRepsMin?: number | null;
    prescribedRepsMax?: number | null;
    prescribedDurationSeconds?: number | null;
    prescribedWeight?: number | null;
    restSeconds?: number | null;
    notes?: string | null;
    setsData?: any; // array set eterogenei [{ reps, weight, rest_seconds }]
    blockTempId?: string; // ref locale al circuito (vedi `blocks` sotto)
    protocolType?: string; // 'SET' | 'RAMPING' | ... default 'SET'
    protocolParams?: any;
  }>;
  // Circuiti opzionali da duplicare in workout_blocks (puro raggruppamento);
  // gli esercizi possono referenziarli via `blockTempId`.
  blocks?: Array<{
    tempId: string;
    orderIndex: number;
    type: string;
    name?: string | null;
    params?: any;
    infoNote?: string | null;
  }>;
}) {
  const {
    atletaUserId, ptUserId, title, description, templateId, templateKind,
    scheduledDate, dueDate, exercises, blocks,
  } = params;

  // Crea workout
  const { data: workout, error: workoutError } = await supabase
    .from('workouts')
    .insert({
      atleta_user_id: atletaUserId,
      pt_user_id: ptUserId,
      title,
      description,
      template_id: templateId,
      template_kind: templateKind ?? 'libera',
      scheduled_date: scheduledDate,
      due_date: dueDate,
      status: 'attivo',
    })
    .select()
    .single();

  if (workoutError) {
    throw new Error('Errore creazione workout: ' + workoutError.message);
  }

  // Mappa tempId → real workout_block id
  const blockIdMap = new Map<string, string>();

  if (blocks && blocks.length > 0) {
    const blockInserts = blocks.map((b) => ({
      workout_id: workout.id,
      order_index: b.orderIndex,
      type: b.type as any,
      name: b.name ?? null,
      params: b.params ?? {},
      info_note: b.infoNote ?? null,
    }));
    const { data: insertedBlocks, error: blocksErr } = await supabase
      .from('workout_blocks')
      .insert(blockInserts)
      .select('id, order_index');
    if (blocksErr) {
      await supabase.from('workouts').delete().eq('id', workout.id);
      throw new Error('Errore creazione blocchi: ' + blocksErr.message);
    }
    // Associa per orderIndex (univoco nella stessa creazione)
    const byOrder = new Map<number, string>();
    (insertedBlocks || []).forEach((b: any) => byOrder.set(b.order_index, b.id));
    blocks.forEach((b) => {
      const realId = byOrder.get(b.orderIndex);
      if (realId) blockIdMap.set(b.tempId, realId);
    });
  }

  // Aggiungi esercizi
  if (exercises.length > 0) {
    const exerciseInserts = exercises.map((ex) => ({
      workout_id: workout.id,
      exercise_id: ex.exerciseId,
      order_index: ex.orderIndex,
      prescribed_sets: ex.prescribedSets,
      prescribed_reps_min: ex.prescribedRepsMin ?? null,
      prescribed_reps_max: ex.prescribedRepsMax ?? null,
      prescribed_duration_seconds: ex.prescribedDurationSeconds ?? null,
      prescribed_weight: ex.prescribedWeight ?? null,
      rest_seconds: ex.restSeconds ?? 60,
      notes: ex.notes ?? null,
      sets_data: ex.setsData ?? null,
      block_id: ex.blockTempId ? blockIdMap.get(ex.blockTempId) ?? null : null,
      protocol_type: ex.protocolType ?? 'SET',
      protocol_params: ex.protocolParams ?? {},
    }));

    const { error: exercisesError } = await supabase
      .from('workout_exercises')
      .insert(exerciseInserts);

    if (exercisesError) {
      await supabase.from('workouts').delete().eq('id', workout.id);
      throw new Error('Errore aggiunta esercizi: ' + exercisesError.message);
    }
  }

  return workout;
}

// =====================================================
// OTTIENI WORKOUTS ATLETA
// =====================================================

export async function getAtletaWorkouts(atletaUserId: string, status?: 'attivo' | 'completato' | 'scaduto') {
  let query = supabase
    .from('workouts')
    .select(`
      *,
      workout_exercises (
        *,
        exercises (*)
      )
    `)
    .eq('atleta_user_id', atletaUserId)
    .order('scheduled_date', { ascending: true, nullsFirst: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Errore recupero workouts: ' + error.message);
  }

  return data;
}

// =====================================================
// OTTIENI WORKOUTS CREATI DA PT
// =====================================================

export async function getPTCreatedWorkouts(ptUserId: string, atletaUserId?: string) {
  let query = supabase
    .from('workouts')
    .select(`
      *,
      profiles:atleta_user_id (
        first_name,
        last_name,
        avatar_url
      ),
      workout_exercises (
        *,
        exercises (name, category)
      )
    `)
    .eq('pt_user_id', ptUserId)
    .order('created_at', { ascending: false });

  if (atletaUserId) {
    query = query.eq('atleta_user_id', atletaUserId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Errore recupero workouts: ' + error.message);
  }

  return data;
}

// =====================================================
// COMPLETA WORKOUT
// =====================================================

export async function completeWorkout(workoutId: string, feedback?: {
  notesAtleta?: string;
  rating?: number;
}) {
  const { data, error } = await supabase
    .from('workouts')
    .update({
      status: 'completato',
      completed_at: new Date().toISOString(),
      notes_atleta: feedback?.notesAtleta,
      rating: feedback?.rating,
    })
    .eq('id', workoutId)
    .in('status', ['attivo', 'in_corso'])
    .select()
    .single();

  if (error) {
    throw new Error('Errore completamento workout: ' + error.message);
  }

  return data;
}

// =====================================================
// LOG ESERCIZIO
// =====================================================

export async function logExerciseSet(params: {
  workoutExerciseId: string;
  setNumber: number;
  repsCompleted?: number;
  weightUsed?: number;
  durationSeconds?: number;
  rpe?: number;
  notes?: string;
}) {
  const { data, error } = await supabase
    .from('workout_logs')
    .upsert(
      {
        workout_exercise_id: params.workoutExerciseId,
        set_number: params.setNumber,
        reps_completed: params.repsCompleted,
        weight_used: params.weightUsed,
        duration_seconds: params.durationSeconds,
        is_completed: true,
        rpe: params.rpe,
        notes: params.notes,
      },
      { onConflict: 'workout_exercise_id,set_number' },
    )
    .select()
    .single();

  if (error) {
    throw new Error('Errore log esercizio: ' + error.message);
  }

  return data;
}

// =====================================================
// OTTIENI LOGS WORKOUT
// =====================================================

export async function getWorkoutLogs(workoutId: string) {
  const { data, error } = await supabase
    .from('workout_exercises')
    .select(`
      *,
      exercises (*),
      workout_logs (*)
    `)
    .eq('workout_id', workoutId)
    .order('order_index', { ascending: true });

  if (error) {
    throw new Error('Errore recupero logs: ' + error.message);
  }

  return data;
}

// =====================================================
// CONTA WORKOUT COMPLETATI
// =====================================================

export async function countCompletedWorkouts(atletaUserId: string): Promise<number> {
  const { data, error } = await supabase
    .rpc('count_completed_workouts', { _atleta_user_id: atletaUserId });

  if (error) {
    throw new Error('Errore conteggio: ' + error.message);
  }

  return data ?? 0;
}

// =====================================================
// IMPORTA SCHEDA (da AI) → workout_templates + template_exercises
// Riusa esercizi esistenti per nome (case-insensitive),
// altrimenti crea un nuovo esercizio privato del PT.
// =====================================================

export interface ImportedTemplateExerciseInput {
  name: string;
  sets: number;
  reps: number | null;
  rest_seconds: number | null;
  protocol_type:
    | 'standard'
    | 'emom'
    | 'amrap'
    | 'superset'
    | 'hiit'
    | 'tabata';
  notes: string | null;
  protocol_config?: Record<string, unknown> | null;
}

const PROTOCOL_MAP: Record<ImportedTemplateExerciseInput['protocol_type'], string> = {
  standard: 'SET',
  emom: 'EMOM',
  amrap: 'AMRAP',
  superset: 'SUPERSET',
  hiit: 'HIIT',
  tabata: 'TABATA',
};

export async function importTemplateFromAI(params: {
  ptUserId: string;
  templateName: string;
  exercises: ImportedTemplateExerciseInput[];
}) {
  const { ptUserId, templateName, exercises } = params;

  if (!templateName.trim()) throw new Error('Nome scheda mancante');
  if (!exercises.length) throw new Error('Nessun esercizio da importare');

  // 1. Crea template
  const { data: template, error: tplErr } = await supabase
    .from('workout_templates')
    .insert({
      pt_user_id: ptUserId,
      title: templateName.trim(),
      is_public: false,
    })
    .select()
    .single();

  if (tplErr || !template) {
    throw new Error('Errore creazione scheda: ' + (tplErr?.message ?? 'unknown'));
  }

  try {
    // 2. Risolvi exercise_id — batch lookup case-insensitive, poi crea i mancanti
    const trimmedNames = exercises.map((ex) => {
      const name = ex.name?.trim();
      if (!name) throw new Error('Esercizio senza nome');
      return name;
    });

    const uniqueNames = [...new Set(trimmedNames)];
    const ilikeOrFilter = uniqueNames
      .map((name) => {
        const escaped = /[,.()]/.test(name) ? `"${name.replace(/"/g, '""')}"` : name;
        return `name.ilike.${escaped}`;
      })
      .join(',');

    const { data: matches, error: findErr } = await supabase
      .from('exercises')
      .select('id, name, is_public, created_by')
      .or(ilikeOrFilter);

    if (findErr) throw new Error('Errore ricerca esercizio: ' + findErr.message);

    const exerciseIdByLowerName = new Map<string, string>();
    for (const row of matches ?? []) {
      if (!row.is_public && row.created_by !== ptUserId) continue;
      const key = row.name.trim().toLowerCase();
      if (!exerciseIdByLowerName.has(key)) {
        exerciseIdByLowerName.set(key, row.id);
      }
    }

    const exerciseIds: string[] = [];

    for (const name of trimmedNames) {
      let exerciseId = exerciseIdByLowerName.get(name.toLowerCase());

      if (!exerciseId) {
        const { data: created, error: createErr } = await supabase
          .from('exercises')
          .insert({
            name,
            category: 'altro',
            is_public: false,
            created_by: ptUserId,
          })
          .select('id')
          .single();
        if (createErr || !created) {
          throw new Error('Errore creazione esercizio: ' + (createErr?.message ?? 'unknown'));
        }
        exerciseId = created.id;
        exerciseIdByLowerName.set(name.toLowerCase(), exerciseId);
      }

      exerciseIds.push(exerciseId);
    }

    // 3. Inserisci template_exercises
    const inserts = exercises.map((ex, idx) => ({
      template_id: template.id,
      exercise_id: exerciseIds[idx],
      order_index: idx,
      sets: ex.sets > 0 ? ex.sets : 1,
      reps_min: ex.reps ?? null,
      reps_max: ex.reps ?? null,
      rest_seconds: ex.rest_seconds ?? 60,
      notes: ex.notes ?? null,
      protocol_type: PROTOCOL_MAP[ex.protocol_type] ?? 'SET',
      protocol_params: (ex.protocol_config ?? {}) as any,
    }));

    const { error: insErr } = await supabase
      .from('template_exercises')
      .insert(inserts);

    if (insErr) {
      throw new Error('Errore inserimento esercizi: ' + insErr.message);
    }

    return template;
  } catch (e) {
    // rollback best-effort
    await supabase.from('workout_templates').delete().eq('id', template.id);
    throw e;
  }
}

