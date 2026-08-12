import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { listOwnedAthleteIds } from '@/lib/api/collaborators';
import { getCededAthletes } from '@/lib/api/connections';

// =====================================================
// Relazione PT ↔ atleta (una sola dimensione UI):
// titolare | in coaching | ceduto
// =====================================================

export type AthleteRelation = 'owner' | 'coaching' | 'ceded';
export type AthleteRelationFilterValue = 'all' | AthleteRelation;

export const ATHLETE_RELATION_OPTIONS: Array<{
  value: AthleteRelationFilterValue;
  label: string;
}> = [
  { value: 'all', label: 'Tutti' },
  { value: 'owner', label: 'Titolare' },
  { value: 'coaching', label: 'In coaching' },
  { value: 'ceded', label: 'Ceduti' },
];

export function useAthleteRelations() {
  const { user } = useAuth();
  const ptUserId = user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['pt-athlete-relations', ptUserId],
    queryFn: async () => {
      if (!ptUserId) return { owned: [] as string[], ceded: [] as string[] };
      const [owned, ceded] = await Promise.all([
        listOwnedAthleteIds(ptUserId).catch(() => [] as string[]),
        getCededAthletes()
          .then((rows) => rows.map((r) => r.atleta_user_id))
          .catch(() => [] as string[]),
      ]);
      return { owned, ceded };
    },
    enabled: !!ptUserId,
    staleTime: 60_000,
  });

  const ownedSet = useMemo(() => new Set(data?.owned ?? []), [data?.owned]);
  const cededSet = useMemo(() => new Set(data?.ceded ?? []), [data?.ceded]);

  const getRelation = useMemo(
    () =>
      (atletaUserId: string): AthleteRelation => {
        if (cededSet.has(atletaUserId)) return 'ceded';
        if (ownedSet.has(atletaUserId)) return 'owner';
        return 'coaching';
      },
    [ownedSet, cededSet],
  );

  const matchesRelation = useMemo(
    () =>
      (atletaUserId: string, filter: AthleteRelationFilterValue): boolean =>
        filter === 'all' || getRelation(atletaUserId) === filter,
    [getRelation],
  );

  return { getRelation, matchesRelation, isLoading };
}
