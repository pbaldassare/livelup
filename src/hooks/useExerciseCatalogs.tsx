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

// =====================================================
// Hook: Catalogi esercizi del PT
// Un catalogo ├¿ un insieme omogeneo di esercizi (nome + emoji + descrizione).
// L'assegnazione degli esercizi a un catalogo ├¿ un task futuro:
// per ora si gestisce solo la creazione/elenco dei catalogi.
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
          emoji: params.emoji.trim() || '­ƒùé´©Å',
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

// =====================================================
// Assegnazione esercizio <-> catalogo (tabella di giunzione exercise_catalog_items)
// =====================================================

const MISSING_ITEMS_TABLE_MESSAGE =
  'Tabella cataloghi esercizi non ancora creata sul backend. Applica la migration exercise_catalog_items su Lovable Cloud.';

/** Elenco degli id catalogo a cui appartiene un esercizio (per il PT corrente). */
export function useExerciseCatalogItems(exerciseId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['pt-exercise-catalog-items', exerciseId],
    queryFn: async () => {
      if (!exerciseId) return [];
      const { data, error } = await supabase
        .from('exercise_catalog_items')
        .select('catalog_id')
        .eq('exercise_id', exerciseId);
      if (error) throw error;
      return (data ?? []).map((row) => row.catalog_id as string);
    },
    enabled: !!exerciseId && enabled,
  });
}

/** Aggiunge o rimuove un esercizio da un catalogo. */
export function useToggleCatalogItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { exerciseId: string; catalogId: string; checked: boolean }) => {
      if (params.checked) {
        const { error } = await supabase
          .from('exercise_catalog_items')
          .insert({ exercise_id: params.exerciseId, catalog_id: params.catalogId });
        // 23505 = riga gi├á presente (checkbox cliccata due volte in rapida successione): non ├¿ un errore per l'utente
        if (error && error.code !== '23505') throw error;
      } else {
        const { error } = await supabase
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
    },
    onError: (err: unknown) => {
      console.error('[useToggleCatalogItem] update failed:', err);
      if (isMissingTableError(err)) {
        toast.error(MISSING_ITEMS_TABLE_MESSAGE);
        return;
      }
      const message = getErrorMessage(err);
      toast.error(message ? `Errore nell'aggiornamento del catalogo: ${message}` : "Errore nell'aggiornamento del catalogo");
    },
  });
}
