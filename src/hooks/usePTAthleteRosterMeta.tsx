import { useQuery } from '@tanstack/react-query';
import { listOwnedAthleteIds } from '@/lib/api/collaborators';
import { getCededAthletes, type CededAthlete } from '@/lib/api/connections';

export type OwnershipFilter = 'all' | 'mine' | 'coaching';
export type CededFilter = 'all' | 'ceded' | 'not_ceded';

export type AthleteRosterRole = 'owner' | 'coaching' | 'unknown';

export interface CededMeta {
  is_recallable: boolean;
  current_pt_user_id: string | null;
  transferred_at: string | null;
}

/**
 * Meta roster PT: ownership (titolare) + cessione attiva (ceduti).
 * Usato da lista Atleti desktop e mobile.
 */
export function usePTAthleteRosterMeta(ptUserId: string | undefined) {
  const ownedQuery = useQuery({
    queryKey: ['pt-owned-athlete-ids', ptUserId],
    queryFn: async () => {
      if (!ptUserId) return [] as string[];
      try {
        return await listOwnedAthleteIds(ptUserId);
      } catch {
        // Migration non applicata: nessun filtro ownership (tutti "unknown")
        return [] as string[];
      }
    },
    enabled: !!ptUserId,
    staleTime: 30_000,
  });

  const cededQuery = useQuery({
    queryKey: ['pt-ceded-athletes', ptUserId],
    queryFn: async () => {
      try {
        return await getCededAthletes();
      } catch {
        return [] as CededAthlete[];
      }
    },
    enabled: !!ptUserId,
    staleTime: 30_000,
  });

  const ownedIds = new Set(ownedQuery.data ?? []);
  const cededByAthlete = new Map<string, CededMeta>();
  for (const row of cededQuery.data ?? []) {
    cededByAthlete.set(row.atleta_user_id, {
      is_recallable: Boolean(row.is_recallable),
      current_pt_user_id: row.current_pt_user_id,
      transferred_at: row.transferred_at,
    });
  }

  function getRole(atletaUserId: string): AthleteRosterRole {
    if (!ownedQuery.isFetched) return 'unknown';
    if (ownedQuery.isError) return 'unknown';
    // Nessun record ownership: tratta tutti come titolare (fallback legacy)
    if (ownedIds.size === 0) return 'owner';
    return ownedIds.has(atletaUserId) ? 'owner' : 'coaching';
  }

  function isCeded(atletaUserId: string): boolean {
    return cededByAthlete.has(atletaUserId);
  }

  function getCededMeta(atletaUserId: string): CededMeta | null {
    return cededByAthlete.get(atletaUserId) ?? null;
  }

  function matchesFilters(
    atletaUserId: string,
    ownership: OwnershipFilter,
    ceded: CededFilter,
  ): boolean {
    const role = getRole(atletaUserId);
    if (ownership === 'mine' && role !== 'owner') return false;
    if (ownership === 'coaching' && role !== 'coaching') return false;

    const cededNow = isCeded(atletaUserId);
    if (ceded === 'ceded' && !cededNow) return false;
    if (ceded === 'not_ceded' && cededNow) return false;

    return true;
  }

  return {
    ownedIds,
    cededByAthlete,
    getRole,
    isCeded,
    getCededMeta,
    matchesFilters,
    isLoading: ownedQuery.isLoading || cededQuery.isLoading,
    refetch: async () => {
      await Promise.all([ownedQuery.refetch(), cededQuery.refetch()]);
    },
  };
}
