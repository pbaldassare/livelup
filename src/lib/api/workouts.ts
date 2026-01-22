// =====================================================
// API: Gestione Allenamenti
// CRUD workout e log
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import type { Workout, WorkoutExercise, WorkoutLog } from '@/types/database';

// =====================================================
// CREA WORKOUT
// =====================================================

export async function createWorkout(params: {
  atletaUserId: string;
  ptUserId: string;
  title: string;
  description?: string;
  templateId?: string;
  scheduledDate?: string;
  dueDate?: string;
  exercises: Array<{
    exerciseId: string;
    orderIndex: number;
    prescribedSets: number;
    prescribedRepsMin?: number;
    prescribedRepsMax?: number;
    prescribedWeight?: number;
    restSeconds?: number;
    notes?: string;
  }>;
}) {
  const { atletaUserId, ptUserId, title, description, templateId, scheduledDate, dueDate, exercises } = params;

  // Crea workout
  const { data: workout, error: workoutError } = await supabase
    .from('workouts')
    .insert({
      atleta_user_id: atletaUserId,
      pt_user_id: ptUserId,
      title,
      description,
      template_id: templateId,
      scheduled_date: scheduledDate,
      due_date: dueDate,
      status: 'attivo',
    })
    .select()
    .single();

  if (workoutError) {
    throw new Error('Errore creazione workout: ' + workoutError.message);
  }

  // Aggiungi esercizi
  if (exercises.length > 0) {
    const exerciseInserts = exercises.map((ex) => ({
      workout_id: workout.id,
      exercise_id: ex.exerciseId,
      order_index: ex.orderIndex,
      prescribed_sets: ex.prescribedSets,
      prescribed_reps_min: ex.prescribedRepsMin,
      prescribed_reps_max: ex.prescribedRepsMax,
      prescribed_weight: ex.prescribedWeight,
      rest_seconds: ex.restSeconds ?? 60,
      notes: ex.notes,
    }));

    const { error: exercisesError } = await supabase
      .from('workout_exercises')
      .insert(exerciseInserts);

    if (exercisesError) {
      // Rollback: elimina workout
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
    .eq('status', 'attivo')
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
    .insert({
      workout_exercise_id: params.workoutExerciseId,
      set_number: params.setNumber,
      reps_completed: params.repsCompleted,
      weight_used: params.weightUsed,
      duration_seconds: params.durationSeconds,
      is_completed: true,
      rpe: params.rpe,
      notes: params.notes,
    })
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
