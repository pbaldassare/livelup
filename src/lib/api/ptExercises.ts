import { supabase } from '@/integrations/supabase/client';

/** Elimina un esercizio creato dal PT. Blocca se è in un corso o in allenamenti assegnati. */
export async function deleteOwnPtExercise(exerciseId: string, userId: string) {
  const { data: exercise, error: fetchError } = await supabase
    .from('exercises')
    .select('id, created_by')
    .eq('id', exerciseId)
    .single();

  if (fetchError || !exercise) {
    throw new Error('Esercizio non trovato');
  }
  if (exercise.created_by !== userId) {
    throw new Error('Puoi eliminare solo gli esercizi che hai creato tu');
  }

  const { count: courseCount, error: courseError } = await supabase
    .from('pt_course_step_exercises')
    .select('*', { count: 'exact', head: true })
    .eq('exercise_id', exerciseId);
  if (courseError) throw courseError;
  if ((courseCount || 0) > 0) {
    throw new Error('Esercizio usato in un corso. Rimuovilo dal corso prima di eliminarlo.');
  }

  const { count: assignedCount, error: assignedError } = await supabase
    .from('workout_exercises')
    .select('id', { count: 'exact', head: true })
    .eq('exercise_id', exerciseId);
  if (assignedError) throw assignedError;
  if ((assignedCount || 0) > 0) {
    throw new Error(
      'Esercizio usato in allenamenti già assegnati. Togli prima l\'assegnazione all\'atleta.',
    );
  }

  const { error } = await supabase.from('exercises').delete().eq('id', exerciseId);
  if (error) throw error;
}
