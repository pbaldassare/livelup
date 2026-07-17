// =====================================================
// API: Gestione Allenamenti
// CRUD workout e log
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import type { TemplateKind } from '@/lib/pt/templateKinds';

export type { TemplateKind };

// =====================================================
// CREA WORKOUT
// =====================================================


export async function createWorkout(params: {
  atletaUserId: string;
  ptUserId: string;
  title: string;
  description?: string;
  templateId?: string;
  /** Tipologia scheda snapshot (default libera) */
  templateKind?: TemplateKind;
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
    atletaUserId, ptUserId, title, description, templateId,
    templateKind = 'libera',
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
      template_kind: templateKind,
      scheduled_date: scheduledDate,
      due_date: dueDate,
      status: 'attivo',
    } as any)
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
    .in('status', ['attivo', 'in_corso', 'in_sospeso'])
    .select()
    .single();

  if (error) {
    throw new Error('Errore completamento workout: ' + error.message);
  }

  return data;
}

// =====================================================
// ATTIVA ASSEGNAZIONE (Programmate → In corso + calendario)
// =====================================================

export async function activateWorkoutAssignment(
  workoutId: string,
  params: {
    ptUserId: string;
    scheduledDate: Date;
  },
) {
  const { data: workout, error: fetchErr } = await supabase
    .from('workouts')
    .select('id, title, atleta_user_id, pt_user_id, status')
    .eq('id', workoutId)
    .single();

  if (fetchErr || !workout) {
    throw new Error('Scheda non trovata');
  }
  if (workout.pt_user_id !== params.ptUserId) {
    throw new Error('Non autorizzato');
  }
  if (!['attivo', 'scaduto'].includes(workout.status)) {
    throw new Error('Questa scheda non può essere attivata');
  }

  const scheduled = new Date(params.scheduledDate);
  scheduled.setHours(0, 0, 0, 0);

  const { data: updated, error: updateErr } = await supabase
    .from('workouts')
    .update({
      status: 'in_corso',
      scheduled_date: scheduled.toISOString(),
    })
    .eq('id', workoutId)
    .select()
    .single();

  if (updateErr || !updated) {
    throw new Error('Errore attivazione scheda: ' + (updateErr?.message ?? 'unknown'));
  }

  const start = new Date(scheduled);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  const { error: calErr } = await supabase.from('calendar_events').insert({
    creator_user_id: params.ptUserId,
    pt_user_id: params.ptUserId,
    atleta_user_id: workout.atleta_user_id,
    title: workout.title,
    event_type: 'allenamento',
    category: 'appuntamento',
    start_datetime: start.toISOString(),
    end_datetime: end.toISOString(),
    is_public: false,
    visibility: 'connected_only',
  });

  if (calErr) {
    throw new Error('Scheda attivata ma errore calendario: ' + calErr.message);
  }

  return updated;
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
// DUPLICA / TRASFERISCI ASSEGNAZIONE WORKOUT
// Copia blocchi ed esercizi da un workout esistente
// =====================================================

const IN_PROGRESS_STATUSES = new Set(['in_corso', 'in_sospeso']);

async function copyWorkoutAssignmentToAthlete(
  workoutId: string,
  targetAtletaUserId: string,
  opts?: {
    title?: string;
    scheduledDate?: string | null;
    dueDate?: string | null;
  },
) {
  const { data: original, error: wErr } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', workoutId)
    .single();

  if (wErr || !original) {
    throw new Error('Errore recupero workout: ' + (wErr?.message ?? 'non trovato'));
  }

  const [{ data: blocks }, { data: exercises }] = await Promise.all([
    supabase
      .from('workout_blocks')
      .select('id, order_index, type, name, params, info_note')
      .eq('workout_id', workoutId)
      .order('order_index'),
    supabase
      .from('workout_exercises')
      .select(
        'exercise_id, order_index, prescribed_sets, prescribed_reps_min, prescribed_reps_max, prescribed_duration_seconds, prescribed_weight, rest_seconds, notes, sets_data, block_id, protocol_type, protocol_params',
      )
      .eq('workout_id', workoutId)
      .order('order_index'),
  ]);

  const scheduledDate =
    opts?.scheduledDate !== undefined ? opts.scheduledDate : original.scheduled_date;
  const dueDate = opts?.dueDate !== undefined ? opts.dueDate : original.due_date;

  const { data: workout, error: insErr } = await supabase
    .from('workouts')
    .insert({
      atleta_user_id: targetAtletaUserId,
      pt_user_id: original.pt_user_id,
      title: opts?.title ?? original.title,
      description: original.description,
      template_id: original.template_id,
      template_kind: (original as any).template_kind ?? 'libera',
      scheduled_date: scheduledDate,
      due_date: dueDate,
      status: 'attivo',
      // Nuova assegnazione: reset flag riordino atleta
      athlete_reordered_at: null,
    } as any)
    .select()
    .single();

  if (insErr || !workout) {
    throw new Error('Errore duplicazione workout: ' + (insErr?.message ?? 'unknown'));
  }

  const blockIdMap = new Map<string, string>();
  if (blocks?.length) {
    const { data: insertedBlocks, error: bErr } = await supabase
      .from('workout_blocks')
      .insert(
        blocks.map((b) => ({
          workout_id: workout.id,
          order_index: b.order_index,
          type: b.type,
          name: b.name,
          params: b.params ?? {},
          info_note: b.info_note,
        })),
      )
      .select('id, order_index');

    if (bErr) {
      await supabase.from('workouts').delete().eq('id', workout.id);
      throw new Error('Errore copia blocchi: ' + bErr.message);
    }

    for (const b of insertedBlocks ?? []) {
      const src = blocks.find((x) => x.order_index === b.order_index);
      if (src) blockIdMap.set(src.id, b.id);
    }
  }

  if (exercises?.length) {
    const { error: exErr } = await supabase.from('workout_exercises').insert(
      exercises.map((e) => ({
        workout_id: workout.id,
        exercise_id: e.exercise_id,
        order_index: e.order_index,
        prescribed_sets: e.prescribed_sets,
        prescribed_reps_min: e.prescribed_reps_min,
        prescribed_reps_max: e.prescribed_reps_max,
        prescribed_duration_seconds: e.prescribed_duration_seconds,
        prescribed_weight: e.prescribed_weight,
        rest_seconds: e.rest_seconds ?? 60,
        notes: e.notes,
        sets_data: e.sets_data,
        block_id: e.block_id ? blockIdMap.get(e.block_id) ?? null : null,
        protocol_type: e.protocol_type ?? 'SET',
        protocol_params: e.protocol_params ?? {},
      })),
    );

    if (exErr) {
      await supabase.from('workouts').delete().eq('id', workout.id);
      throw new Error('Errore copia esercizi: ' + exErr.message);
    }
  }

  return workout;
}

/** Duplica per lo stesso atleta → Programmate (status attivo). */
export async function duplicateWorkoutAssignment(
  workoutId: string,
  opts?: { scheduledDate?: string | null },
) {
  const { data: original, error: wErr } = await supabase
    .from('workouts')
    .select('atleta_user_id, title, status, scheduled_date')
    .eq('id', workoutId)
    .single();

  if (wErr || !original) {
    throw new Error('Errore recupero workout: ' + (wErr?.message ?? 'non trovato'));
  }

  const scheduledDate =
    opts?.scheduledDate !== undefined
      ? opts.scheduledDate
      : IN_PROGRESS_STATUSES.has(original.status)
        ? null
        : original.scheduled_date;

  return copyWorkoutAssignmentToAthlete(workoutId, original.atleta_user_id, {
    title: `${original.title} (Copia)`,
    scheduledDate,
  });
}

/** Copia una scheda programmata ad altri atleti e annulla l'originale. */
export async function transferWorkoutToAthletes(
  workoutId: string,
  params: {
    ptUserId: string;
    sourceAtletaUserId: string;
    targetAtletaUserIds: string[];
  },
) {
  const { data: original, error: wErr } = await supabase
    .from('workouts')
    .select('id, pt_user_id, atleta_user_id, status')
    .eq('id', workoutId)
    .single();

  if (wErr || !original) {
    throw new Error('Scheda non trovata');
  }
  if (original.pt_user_id !== params.ptUserId) {
    throw new Error('Non autorizzato');
  }
  if (original.atleta_user_id !== params.sourceAtletaUserId) {
    throw new Error('Scheda non appartiene a questo atleta');
  }
  if (!['attivo', 'scaduto'].includes(original.status)) {
    throw new Error('Solo le schede programmate possono essere riassegnate');
  }

  const targets = [...new Set(params.targetAtletaUserIds)].filter(
    (id) => id !== params.sourceAtletaUserId,
  );
  if (targets.length === 0) {
    throw new Error('Seleziona almeno un atleta diverso da quello corrente');
  }

  const created = [];
  for (const targetId of targets) {
    const copy = await copyWorkoutAssignmentToAthlete(workoutId, targetId, {
      scheduledDate: null,
    });
    created.push(copy);
  }

  const { error: cancelErr } = await supabase
    .from('workouts')
    .update({ status: 'saltato' })
    .eq('id', workoutId);

  if (cancelErr) {
    throw new Error('Copie create ma errore annullamento originale: ' + cancelErr.message);
  }

  return created;
}

/** Copia una scheda ad altri atleti senza modificare l'originale (es. in corso). */
export async function duplicateWorkoutToAthletes(
  workoutId: string,
  params: {
    ptUserId: string;
    sourceAtletaUserId: string;
    targetAtletaUserIds: string[];
  },
) {
  const { data: original, error: wErr } = await supabase
    .from('workouts')
    .select('id, pt_user_id, atleta_user_id')
    .eq('id', workoutId)
    .single();

  if (wErr || !original) {
    throw new Error('Scheda non trovata');
  }
  if (original.pt_user_id !== params.ptUserId) {
    throw new Error('Non autorizzato');
  }
  if (original.atleta_user_id !== params.sourceAtletaUserId) {
    throw new Error('Scheda non appartiene a questo atleta');
  }

  const targets = [...new Set(params.targetAtletaUserIds)].filter(
    (id) => id !== params.sourceAtletaUserId,
  );
  if (targets.length === 0) {
    throw new Error('Seleziona almeno un atleta diverso da quello corrente');
  }

  const created = [];
  for (const targetId of targets) {
    const copy = await copyWorkoutAssignmentToAthlete(workoutId, targetId, {
      scheduledDate: null,
    });
    created.push(copy);
  }

  return created;
}

// =====================================================
// SCHEDA LIBERA — riordino esercizi free (lato atleta)
// Solo prima di iniziare; i circuiti restano fissi.
// =====================================================

export async function reorderWorkoutFreeExercises(
  workoutId: string,
  orderedFreeExerciseIds: string[],
) {
  const { error } = await supabase.rpc('atleta_reorder_workout_exercises' as any, {
    _workout_id: workoutId,
    _ordered_free_exercise_ids: orderedFreeExerciseIds,
  } as any);

  if (error) {
    throw new Error(error.message || 'Impossibile riordinare gli esercizi');
  }
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

