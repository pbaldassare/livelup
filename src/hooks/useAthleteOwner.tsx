import { useQuery } from '@tanstack/react-query';
import { getAthleteOwnerPt, isAthleteOwner } from '@/lib/api/collaborators';
import { useAuth } from '@/hooks/useAuth';

/**
 * Ownership gate for ceded-athlete model:
 * titolare = pt_athlete_owners.owner_pt_user_id (not "has active connection").
 */
export function useAthleteOwner(atletaUserId: string | undefined) {
  const { user } = useAuth();
  const ptUserId = user?.id;

  const query = useQuery({
    queryKey: ['athlete-owner', atletaUserId, ptUserId],
    queryFn: async () => {
      if (!atletaUserId || !ptUserId) {
        return { ownerPtUserId: null as string | null, isOwner: false };
      }
      const [ownerPtUserId, owner] = await Promise.all([
        getAthleteOwnerPt(atletaUserId),
        isAthleteOwner(atletaUserId, ptUserId),
      ]);
      return { ownerPtUserId, isOwner: owner };
    },
    enabled: !!atletaUserId && !!ptUserId,
    staleTime: 30_000,
  });

  return {
    ownerPtUserId: query.data?.ownerPtUserId ?? null,
    isOwner: query.data?.isOwner ?? false,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
