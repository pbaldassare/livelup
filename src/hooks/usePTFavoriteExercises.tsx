import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// =====================================================
// Hook: Preferiti esercizi del PT
// - useFavoriteIds(): Set<string> degli exercise_id preferiti
// - useFavoriteExercises(): lista completa degli esercizi preferiti
// - useToggleFavorite(): toggle add/remove con optimistic update
// =====================================================

export function useFavoriteIds(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pt-favorite-exercise-ids', user?.id],
    queryFn: async () => {
      if (!user?.id) return new Set<string>();
      const { data, error } = await supabase
        .from('pt_favorite_exercises')
        .select('exercise_id')
        .eq('pt_user_id', user.id);
      if (error) throw error;
      return new Set<string>((data || []).map((r) => r.exercise_id));
    },
    enabled: !!user?.id && (options?.enabled ?? true),
  });
}

export function useFavoriteExercises() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pt-favorite-exercises', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: favs, error: favErr } = await supabase
        .from('pt_favorite_exercises')
        .select('exercise_id, created_at')
        .eq('pt_user_id', user.id);
      if (favErr) throw favErr;
      const ids = (favs || []).map((f) => f.exercise_id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .in('id', ids)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
}

export function useToggleFavorite() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      exerciseId,
      isFavorite,
    }: {
      exerciseId: string;
      isFavorite: boolean;
    }) => {
      if (!user?.id) throw new Error('Non autenticato');
      if (isFavorite) {
        const { error } = await supabase
          .from('pt_favorite_exercises')
          .delete()
          .eq('pt_user_id', user.id)
          .eq('exercise_id', exerciseId);
        if (error) throw error;
        return { exerciseId, action: 'removed' as const };
      } else {
        const { error } = await supabase
          .from('pt_favorite_exercises')
          .insert({ pt_user_id: user.id, exercise_id: exerciseId });
        if (error) throw error;
        return { exerciseId, action: 'added' as const };
      }
    },
    onMutate: async ({ exerciseId, isFavorite }) => {
      const key = ['pt-favorite-exercise-ids', user?.id];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Set<string>>(key);
      const next = new Set(prev || []);
      if (isFavorite) next.delete(exerciseId);
      else next.add(exerciseId);
      qc.setQueryData(key, next);
      return { prev };
    },
    onError: (err: any, _vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(['pt-favorite-exercise-ids', user?.id], ctx.prev);
      }
      toast.error(err?.message || 'Errore aggiornamento preferiti');
    },
    onSuccess: (res) => {
      toast.success(
        res.action === 'added' ? 'Aggiunto ai tuoi esercizi' : 'Rimosso dai preferiti'
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['pt-favorite-exercise-ids', user?.id] });
      qc.invalidateQueries({ queryKey: ['pt-favorite-exercises', user?.id] });
      qc.invalidateQueries({ queryKey: ['template-exercises-library'] });
    },
  });
}
