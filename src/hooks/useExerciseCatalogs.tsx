import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Bypass typed client for tables not yet reflected in generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

function getErrorMessage(err: unknown): string | undefined {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return undefined;
}

function isMissingTableError(err: unknown): boolean {
  const code = err && typeof err === 'object' && 'code' in err ? (err as { code?: unknown }).code : undefined;
  if (code === 'PGRST205') return true;
  const message = getErrorMessage(err)?.toLowerCase() ?? '';
  return message.includes('schema cache') || message.includes('does not exist');
}

const MISSING_TABLE_MESSAGE =
  'Tabella cataloghi non ancora creata sul backend. Applica la migration exercise_catalogs su Lovable Cloud.';
const MISSING_ITEMS_TABLE_MESSAGE =
  'Tabella cataloghi esercizi non ancora creata sul backend. Applica la migration exercise_catalog_items su Lovable Cloud.';

export interface ExerciseCatalog {
  id: string;
  pt_user_id: string;
  name: string;
  emoji: string;
  description: string | null;
  is_public?: boolean;
  created_at: string;
  updated_at: string;
}

export type CatalogAccess = 'owned' | 'shared' | 'public';

export function getCatalogAccess(catalog: ExerciseCatalog, userId: string | undefined): CatalogAccess {
  if (userId && catalog.pt_user_id === userId) return 'owned';
  if (catalog.is_public) return 'public';
  return 'shared';
}

export interface CatalogShareRow {
  id: string;
  catalog_id: string;
  shared_with_user_id: string;
  created_at: string;
}

export interface CatalogExerciseRow {
  itemId: string;
  exerciseId: string;
  exercise: {
    id: string;
    name: string;
    category: string | null;
    image_url: string | null;
  } | null;
}

export function useExerciseCatalogs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pt-exercise-catalogs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await sb
        .from('exercise_catalogs')
        .select('*')
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
    mutationFn: async (params: {
      id?: string;
      name: string;
      emoji: string;
      description?: string | null;
    }) => {
      if (!user?.id) throw new Error('Non autenticato');
      if (params.id) {
        const { data, error } = await sb
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
      }
      const { data, error } = await sb
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
      toast.success('Catalogo salvato');
    },
    onError: (err: unknown) => {
      console.error('[useCreateExerciseCatalog] failed:', err);
      if (isMissingTableError(err)) {
        toast.error(MISSING_TABLE_MESSAGE);
        return;
      }
      const message = getErrorMessage(err);
      toast.error(message ? `Errore: ${message}` : 'Errore nel salvataggio del catalogo');
    },
  });
}

export function useDeleteExerciseCatalog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (catalogId: string) => {
      const { error } = await sb.from('exercise_catalogs').delete().eq('id', catalogId);
      if (error) throw error;
      return catalogId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pt-exercise-catalogs', user?.id] });
      qc.invalidateQueries({ queryKey: ['pt-all-catalog-items'] });
      toast.success('Catalogo eliminato');
    },
    onError: (err: unknown) => {
      if (isMissingTableError(err)) {
        toast.error(MISSING_TABLE_MESSAGE);
        return;
      }
      const message = getErrorMessage(err);
      toast.error(message ? `Errore: ${message}` : 'Errore eliminazione catalogo');
    },
  });
}

/** Elenca gli esercizi appartenenti a un catalogo. */
export function useCatalogExercises(catalogId: string | null) {
  return useQuery({
    queryKey: ['pt-catalog-exercises', catalogId],
    queryFn: async (): Promise<CatalogExerciseRow[]> => {
      if (!catalogId) return [];
      const { data, error } = await sb
        .from('exercise_catalog_items')
        .select('id, exercise_id, exercises:exercise_id (id, name, category, image_url)')
        .eq('catalog_id', catalogId);
      if (error) throw error;
      return ((data ?? []) as Array<{
        id: string;
        exercise_id: string;
        exercises: CatalogExerciseRow['exercise'];
      }>).map((r) => ({
        itemId: r.id,
        exerciseId: r.exercise_id,
        exercise: r.exercises,
      }));
    },
    enabled: !!catalogId,
  });
}

export function useRemoveExerciseFromCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { catalogId: string; exerciseId: string }) => {
      const { error } = await sb
        .from('exercise_catalog_items')
        .delete()
        .eq('catalog_id', params.catalogId)
        .eq('exercise_id', params.exerciseId);
      if (error) throw error;
      return params;
    },
    onSuccess: (params) => {
      qc.invalidateQueries({ queryKey: ['pt-catalog-exercises', params.catalogId] });
      qc.invalidateQueries({ queryKey: ['pt-exercise-catalog-items'] });
      qc.invalidateQueries({ queryKey: ['pt-all-catalog-items'] });
      toast.success('Esercizio rimosso dal catalogo');
    },
    onError: (err: unknown) => {
      if (isMissingTableError(err)) {
        toast.error(MISSING_ITEMS_TABLE_MESSAGE);
        return;
      }
      const message = getErrorMessage(err);
      toast.error(message ? `Errore: ${message}` : 'Errore rimozione esercizio');
    },
  });
}

/** Elenco degli id catalogo a cui appartiene un esercizio. */
export function useExerciseCatalogItems(exerciseId?: string, enabled = true) {
  return useQuery({
    queryKey: ['pt-exercise-catalog-items', exerciseId],
    queryFn: async () => {
      if (!exerciseId) return [];
      const { data, error } = await sb
        .from('exercise_catalog_items')
        .select('catalog_id')
        .eq('exercise_id', exerciseId);
      if (error) throw error;
      return ((data ?? []) as Array<{ catalog_id: string }>).map((row) => row.catalog_id);
    },
    enabled: !!exerciseId && enabled,
  });
}

/** Tutti gli item (exercise_id, catalog_id) per il PT corrente. */
export function useAllPtCatalogItems() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pt-all-catalog-items', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await sb
        .from('exercise_catalog_items')
        .select('exercise_id, catalog_id');
      if (error) throw error;
      return (data ?? []) as { exercise_id: string; catalog_id: string }[];
    },
    enabled: !!user?.id,
  });
}

export function useToggleCatalogItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { exerciseId: string; catalogId: string; checked: boolean }) => {
      if (params.checked) {
        const { error } = await sb
          .from('exercise_catalog_items')
          .insert({ exercise_id: params.exerciseId, catalog_id: params.catalogId });
        if (error && error.code !== '23505') throw error;
      } else {
        const { error } = await sb
          .from('exercise_catalog_items')
          .delete()
          .eq('exercise_id', params.exerciseId)
          .eq('catalog_id', params.catalogId);
        if (error) throw error;
      }
      return params;
    },
    onSuccess: (params) => {
      qc.invalidateQueries({ queryKey: ['pt-exercise-catalog-items', params.exerciseId] });
      qc.invalidateQueries({ queryKey: ['pt-all-catalog-items'] });
      qc.invalidateQueries({ queryKey: ['pt-catalog-exercises', params.catalogId] });
    },
    onError: (err: unknown) => {
      console.error('[useToggleCatalogItem] update failed:', err);
      if (isMissingTableError(err)) {
        toast.error(MISSING_ITEMS_TABLE_MESSAGE);
        return;
      }
      const message = getErrorMessage(err);
      toast.error(message ? `Errore: ${message}` : "Errore nell'aggiornamento del catalogo");
    },
  });
}

export function useCatalogShares(catalogId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['pt-catalog-shares', catalogId],
    queryFn: async (): Promise<CatalogShareRow[]> => {
      if (!catalogId) return [];
      const { data, error } = await sb
        .from('exercise_catalog_shares')
        .select('id, catalog_id, shared_with_user_id, created_at')
        .eq('catalog_id', catalogId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CatalogShareRow[];
    },
    enabled: !!catalogId && enabled,
  });
}

export function useShareExerciseCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { catalogId: string; sharedWithUserId: string }) => {
      const { error } = await sb.from('exercise_catalog_shares').insert({
        catalog_id: params.catalogId,
        shared_with_user_id: params.sharedWithUserId,
      });
      if (error && error.code !== '23505') throw error;
      return params;
    },
    onSuccess: (params) => {
      qc.invalidateQueries({ queryKey: ['pt-catalog-shares', params.catalogId] });
      toast.success('Catalogo condiviso con il PT');
    },
    onError: (err: unknown) => {
      const message = getErrorMessage(err);
      toast.error(message ? `Errore: ${message}` : 'Impossibile condividere il catalogo');
    },
  });
}

export function useRevokeCatalogShare() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { shareId: string; catalogId: string }) => {
      const { error } = await sb.from('exercise_catalog_shares').delete().eq('id', params.shareId);
      if (error) throw error;
      return params;
    },
    onSuccess: (params) => {
      qc.invalidateQueries({ queryKey: ['pt-catalog-shares', params.catalogId] });
      qc.invalidateQueries({ queryKey: ['pt-exercise-catalogs', user?.id] });
      toast.success('Accesso revocato');
    },
    onError: (err: unknown) => {
      const message = getErrorMessage(err);
      toast.error(message ? `Errore: ${message}` : 'Impossibile revocare l\'accesso');
    },
  });
}

export function useSetCatalogPublic() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { catalogId: string; isPublic: boolean }) => {
      const { data, error } = await sb
        .from('exercise_catalogs')
        .update({ is_public: params.isPublic })
        .eq('id', params.catalogId)
        .select('*')
        .single();
      if (error) throw error;
      return data as ExerciseCatalog;
    },
    onSuccess: (catalog) => {
      qc.invalidateQueries({ queryKey: ['pt-exercise-catalogs', user?.id] });
      toast.success(catalog.is_public ? 'Catalogo pubblico: visibile a tutti i PT' : 'Catalogo tornato privato');
    },
    onError: (err: unknown) => {
      const message = getErrorMessage(err);
      toast.error(message ? `Errore: ${message}` : 'Impossibile aggiornare la visibilità');
    },
  });
}
