import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchTemplateDurations,
  fetchTemplateSheetDuration,
  fetchWorkoutDurations,
  type TemplateRoutineRefs,
} from '@/lib/api/sheetDuration';
import type { SheetDuration } from '@/lib/workoutDuration';

const EMPTY: SheetDuration = { mainSeconds: 0, warmupSeconds: 0, cooldownSeconds: 0 };

/**
 * Ricalcola quando TemplateExerciseBuilder rilegge le sue righe
 * (chiavi `['sheet-exercises', kind, parentId, …]`), cioè dopo ogni modifica.
 */
function useRefetchOnSheetChange(kind: 'template' | 'workout', parentId: string | undefined, queryKey: unknown[]) {
  const queryClient = useQueryClient();
  const keyHash = JSON.stringify(queryKey);
  useEffect(() => {
    if (!parentId) return;
    return queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'success') return;
      const key = event.query.queryKey;
      if (key[0] === 'sheet-exercises' && key[1] === kind && key[2] === parentId) {
        queryClient.invalidateQueries({ queryKey: JSON.parse(keyHash) });
      }
    });
  }, [queryClient, kind, parentId, keyHash]);
}

/** Durata live del template in modifica (principale + routine collegate). */
export function useTemplateSheetDuration(templateId: string | undefined, refs: TemplateRoutineRefs) {
  const refsKey = JSON.stringify(refs);
  const queryKey = ['sheet-duration', 'template', templateId, refsKey];
  useRefetchOnSheetChange('template', templateId, queryKey);
  const query = useQuery({
    queryKey,
    queryFn: () => fetchTemplateSheetDuration(templateId!, JSON.parse(refsKey)),
    enabled: !!templateId,
  });
  return { ...query, duration: query.data ?? EMPTY };
}

/** Durata live di un allenamento assegnato in modifica. */
export function useWorkoutSheetDuration(workoutId: string | undefined) {
  const queryKey = ['sheet-duration', 'workout', workoutId];
  useRefetchOnSheetChange('workout', workoutId, queryKey);
  const query = useQuery({
    queryKey,
    queryFn: async () => (await fetchWorkoutDurations([workoutId!]))[workoutId!] ?? EMPTY,
    enabled: !!workoutId,
  });
  return { ...query, duration: query.data ?? EMPTY };
}

/** Durate principali (secondi) per liste di template. */
export function useTemplateDurations(templateIds: string[]) {
  const ids = useMemo(() => [...new Set(templateIds.filter(Boolean))].sort(), [templateIds]);
  return useQuery({
    queryKey: ['template-durations', ids],
    queryFn: () => fetchTemplateDurations(ids),
    enabled: ids.length > 0,
    staleTime: 30_000,
  });
}
