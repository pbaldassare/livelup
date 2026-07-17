import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Supabase/Postgrest errors are plain objects ({ message, details, hint, code }),
// NOT `instanceof Error`. A naive `err instanceof Error` check silently swallows
// the real reason (e.g. missing table, RLS violation) and shows a generic toast.
function getErrorMessage(err: unknown): string | undefined {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return undefined;
}

// PGRST205 (or a "schema cache"/"does not exist" message) means the
// exercise_catalogs table/migration hasn't been applied on the backend yet.
// Surface a specific, actionable Italian message instead of a generic error.
function isMissingTableError(err: unknown): boolean {
  const code = err && typeof err === 'object' && 'code' in err ? (err as { code?: unknown }).code : undefined;
  if (code === 'PGRST205') return true;
  const message = getErrorMessage(err)?.toLowerCase() ?? '';
  return message.includes('schema cache') || message.includes('does not exist');
}

const MISSING_TABLE_MESSAGE =
  'Tabella cataloghi non ancora creata sul backend. Applica la migration exercise_catalogs su Lovable Cloud.';

const MISSING_ITEMS_TABLE_MESSAGE =
  'Tabella associazioni catalogo non ancora creata sul backend. Applica la migration exercise_catalog_items su Lovable Cloud.';

// =====================================================
// Hook: Catalogi esercizi del PT
// Un catalogo è un insieme omogeneo di esercizi (nome + emoji + descrizione).
// L'assegnazione degli esercizi avviene tramite exercise_catalog_items
// (tabella ponte many-to-many con exercises).
// =====================================================

export interface ExerciseCatalog {
  id: string;
  pt_user_id: string;
  name: string;
  emoji: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExerciseCatalogItem {
  id: string;
  catalog_id: string;
  exercise_id: string;
  created_at: string;
}

export interface CatalogExerciseRow {
  itemId: string;
  exerciseId: string;
  exercise: {
    id: string;
    name: string;
    category: string;
    difficulty_level: string;
    image_url: string | null;
  } | null;
}

export function useExerciseCatalogs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pt-exercise-catalogs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('exercise_catalogs')
        .select('*')
        .eq('pt_user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ExerciseCatalog[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateExerciseCatalog() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { name: string; emoji: string; description?: string | null }) => {
      if (!user?.id) throw new Error('Non autenticato');
      const { data, error } = await supabase
        .from('exercise_catalogs')
        .insert({
          pt_user_id: user.id,
          name: params.name.trim(),
          emoji: params.emoji.trim() || '🗂️',
          description: params.description?.trim() || null,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as ExerciseCatalog;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pt-exercise-catalogs', user?.id] });
      toast.success('Catalogo creato con successo');
    },
    onError: (err: unknown) => {
      console.error('[useCreateExerciseCatalog] insert failed:', err);
      if (isMissingTableError(err)) {
        toast.error(MISSING_TABLE_MESSAGE);
        return;
      }
      const message = getErrorMessage(err);
      toast.error(message ? `Errore nella creazione del catalogo: ${message}` : 'Errore nella creazione del catalogo');
    },
  });
}

export function useUpdateExerciseCatalog() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; name: string; emoji: string; description?: string | null }) => {
      const { data, error } = await supabase
        .from('exercise_catalogs')
        .update({
          name: params.name.trim(),
          emoji: params.emoji.trim() || '🗂️',
          description: params.description?.trim() || null,
        })
        .eq('id', params.id)
        .select('*')
        .single();
      if (error) throw error;
      return data as ExerciseCatalog;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pt-exercise-catalogs', user?.id] });
      toast.success('Catalogo aggiornato');
    },
    onError: (err: unknown) => {
      console.error('[useUpdateExerciseCatalog] update failed:', err);
      if (isMissingTableError(err)) {
        toast.error(MISSING_TABLE_MESSAGE);
        return;
      }
      const message = getErrorMessage(err);
      toast.error(message ? `Errore nell'aggiornamento del catalogo: ${message}` : 'Errore nell\'aggiornamento del catalogo');
    },
  });
}

export function useDeleteExerciseCatalog() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (catalogId: string) => {
      const { error } = await supabase.from('exercise_catalogs').delete().eq('id', catalogId);
      if (error) throw error;
      return catalogId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pt-exercise-catalogs', user?.id] });
      qc.invalidateQueries({ queryKey: ['pt-exercise-catalog-items', user?.id] });
      toast.success('Catalogo eliminato');
    },
    onError: (err: unknown) => {
      console.error('[useDeleteExerciseCatalog] delete failed:', err);
      if (isMissingTableError(err)) {
        toast.error(MISSING_TABLE_MESSAGE);
        return;
      }
      const message = getErrorMessage(err);
      toast.error(message ? `Errore nell'eliminazione del catalogo: ${message}` : 'Errore nell\'eliminazione del catalogo');
    },
  });
}

// =====================================================
// Associazione esercizi <-> catalogo (exercise_catalog_items)
// =====================================================

// exercise_catalog_items non è ancora nei tipi generati Supabase:
// il cast `as any` va rimosso quando i tipi verranno rigenerati.
export function useExerciseCatalogItems() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pt-exercise-catalog-items', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase as any)
        .from('exercise_catalog_items')
        .select('id, catalog_id, exercise_id, created_at');
      if (error) throw error;
      return (data ?? []) as ExerciseCatalogItem[];
    },
    enabled: !!user?.id,
  });
}

export function useCatalogExercises(catalogId: string | null) {
  return useQuery({
    queryKey: ['pt-exercise-catalog-exercises', catalogId],
    queryFn: async () => {
      if (!catalogId) return [];
      const { data, error } = await (supabase as any)
        .from('exercise_catalog_items')
        .select('id, exercise_id, exercises(id, name, category, difficulty_level, image_url)')
        .eq('catalog_id', catalogId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: any): CatalogExerciseRow => ({
        itemId: row.id,
        exerciseId: row.exercise_id,
        exercise: row.exercises ?? null,
      }));
    },
    enabled: !!catalogId,
  });
}

export function useToggleCatalogItem() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const itemsKey = ['pt-exercise-catalog-items', user?.id];

  return useMutation({
    mutationFn: async ({ catalogId, exerciseId, isMember }: { catalogId: string; exerciseId: string; isMember: boolean }) => {
      if (isMember) {
        const { error } = await (supabase as any)
          .from('exercise_catalog_items')
          .delete()
          .eq('catalog_id', catalogId)
          .eq('exercise_id', exerciseId);
        if (error) throw error;
        return { action: 'removed' as const };
      }
      const { error } = await (supabase as any)
        .from('exercise_catalog_items')
        .insert({ catalog_id: catalogId, exercise_id: exerciseId });
      if (error) throw error;
      return { action: 'added' as const };
    },
    onMutate: async ({ catalogId, exerciseId, isMember }) => {
      await qc.cancelQueries({ queryKey: itemsKey });
      const prev = qc.getQueryData<ExerciseCatalogItem[]>(itemsKey);
      const base = prev ?? [];
      const next = isMember
        ? base.filter((i) => !(i.catalog_id === catalogId && i.exercise_id === exerciseId))
        : [
            ...base,
            {
              id: `temp-${catalogId}-${exerciseId}`,
              catalog_id: catalogId,
              exercise_id: exerciseId,
              created_at: new Date().toISOString(),
            },
          ];
      qc.setQueryData(itemsKey, next);
      return { prev };
    },
    onError: (err: unknown, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(itemsKey, ctx.prev);
      console.error('[useToggleCatalogItem] mutation failed:', err);
      if (isMissingTableError(err)) {
        toast.error(MISSING_ITEMS_TABLE_MESSAGE);
        return;
      }
      const message = getErrorMessage(err);
      toast.error(message ? `Errore nell'aggiornamento del catalogo: ${message}` : 'Errore nell\'aggiornamento del catalogo');
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: itemsKey });
      if (vars?.catalogId) {
        qc.invalidateQueries({ queryKey: ['pt-exercise-catalog-exercises', vars.catalogId] });
      }
    },
  });
}

export function useRemoveExerciseFromCatalog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const itemsKey = ['pt-exercise-catalog-items', user?.id];

  return useMutation({
    mutationFn: async ({ catalogId, exerciseId }: { catalogId: string; exerciseId: string }) => {
      const { error } = await (supabase as any)
        .from('exercise_catalog_items')
        .delete()
        .eq('catalog_id', catalogId)
        .eq('exercise_id', exerciseId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: itemsKey });
      qc.invalidateQueries({ queryKey: ['pt-exercise-catalog-exercises', vars.catalogId] });
      toast.success('Esercizio rimosso dal catalogo');
    },
    onError: (err: unknown) => {
      console.error('[useRemoveExerciseFromCatalog] delete failed:', err);
      const message = getErrorMessage(err);
      toast.error(message ? `Errore: ${message}` : 'Errore nella rimozione dell\'esercizio');
    },
  });
}
