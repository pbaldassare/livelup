// =====================================================
// HOOK: Stato Atleta - Connection & Feature Gating
// Multi-PT: più connessioni active in parallelo + primary
// =====================================================

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { buildCoachFullName, getCoachInitials } from '@/lib/coachName';

export type AtletaStatus = 'libero' | 'pending' | 'collegato';

export interface AtletaConnection {
  id: string;
  pt_user_id: string;
  status: string;
  accepted_at: string | null;
  requested_by: string | null;
  is_pt_active?: boolean | null;
  is_primary?: boolean | null;
  pt_profiles: {
    bio: string | null;
    specializations: string[] | null;
    rating_avg: number | null;
    hourly_rate: number | null;
  } | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface AtletaProfile {
  id: string;
  fitness_level: string | null;
  goals: string[] | null;
  level: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  status: string;
}

interface UseAtletaStatusReturn {
  status: AtletaStatus;
  /** Primary active connection (legacy compat). Null se nessuno active. */
  connection: AtletaConnection | null;
  /** Tutte le connessioni active. */
  connections: AtletaConnection[];
  /** Richieste pending (inviate o ricevute). */
  pendingConnections: AtletaConnection[];
  profile: AtletaProfile | null;
  isLoading: boolean;
  isConnected: boolean;
  hasPendingRequest: boolean;
  /** True quando almeno un invito pending è stato inviato da un PT */
  pendingInvitationFromPT: boolean;
  /** Nome del coach primario */
  ptName: string | null;
  ptInitials: string;
  ptAvatarUrl: string | null;
  /** Almeno un coaching attivo (non in pausa) */
  isCoachingActive: boolean;
  /** Primary in pausa (legacy); per multi usare connection.is_pt_active */
  isCoachingPaused: boolean;
  canAccessWorkouts: boolean;
  canAccessChat: boolean;
  canAccessProgress: boolean;
  /** Sempre true in multi-PT: può cercare altri coach */
  canSearchPT: boolean;
  /** True se esiste connessione active con quel PT */
  isConnectedToPt: (ptUserId: string | null | undefined) => boolean;
  /** True se connessione active e non in pausa con quel PT */
  canTrainWithPt: (ptUserId: string | null | undefined) => boolean;
  refetch: () => void;
}

async function hydrateConnection(
  row: {
    id: string;
    pt_user_id: string;
    status: string;
    accepted_at: string | null;
    requested_by: string | null;
    is_pt_active?: boolean | null;
    is_primary?: boolean | null;
  },
): Promise<AtletaConnection> {
  const [{ data: ptProfile }, { data: profile }] = await Promise.all([
    supabase
      .from('pt_profiles')
      .select('bio, specializations, rating_avg, hourly_rate')
      .eq('user_id', row.pt_user_id)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('first_name, last_name, avatar_url')
      .eq('user_id', row.pt_user_id)
      .maybeSingle(),
  ]);

  return {
    ...row,
    is_primary: row.is_primary ?? false,
    is_pt_active: row.is_pt_active ?? true,
    pt_profiles: ptProfile,
    profiles: profile,
  };
}

export function useAtletaStatus(): UseAtletaStatusReturn {
  const { user } = useAuth();

  const {
    data,
    isLoading: connectionLoading,
    refetch: refetchConnection,
  } = useQuery({
    queryKey: ['atleta-connection', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return { active: [] as AtletaConnection[], pending: [] as AtletaConnection[] };
      }

      let { data: rows, error } = await supabase
        .from('pt_atleta_connections')
        .select(
          'id, pt_user_id, status, accepted_at, requested_by, is_pt_active, is_primary' as '*',
        )
        .eq('atleta_user_id', user.id)
        .in('status', ['active', 'pending'])
        .order('created_at', { ascending: false });

      if (error && (error.message || '').includes('is_primary')) {
        const mid = await supabase
          .from('pt_atleta_connections')
          .select('id, pt_user_id, status, accepted_at, requested_by, is_pt_active' as '*')
          .eq('atleta_user_id', user.id)
          .in('status', ['active', 'pending'])
          .order('created_at', { ascending: false });
        rows = (mid.data || []).map((r) => ({ ...r, is_primary: false })) as typeof rows;
        error = mid.error;
      }

      if (error && (error.message || '').includes('is_pt_active')) {
        const fallback = await supabase
          .from('pt_atleta_connections')
          .select('id, pt_user_id, status, accepted_at, requested_by')
          .eq('atleta_user_id', user.id)
          .in('status', ['active', 'pending'])
          .order('created_at', { ascending: false });
        rows = (fallback.data || []).map((r) => ({
          ...r,
          is_pt_active: true,
          is_primary: false,
        })) as typeof rows;
        error = fallback.error;
      }

      if (error) throw error;

      const list = rows || [];
      const hydrated = await Promise.all(
        list.map((row) =>
          hydrateConnection(
            row as {
              id: string;
              pt_user_id: string;
              status: string;
              accepted_at: string | null;
              requested_by: string | null;
              is_pt_active?: boolean | null;
              is_primary?: boolean | null;
            },
          ),
        ),
      );

      const active = hydrated
        .filter((c) => c.status === 'active')
        .sort((a, b) => Number(!!b.is_primary) - Number(!!a.is_primary));
      const pending = hydrated.filter((c) => c.status === 'pending');

      return { active, pending };
    },
    enabled: !!user?.id,
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['atleta-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: row, error } = await supabase
        .from('atleta_profiles')
        .select('id, fitness_level, goals, level, weight_kg, height_cm, status')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return row as AtletaProfile | null;
    },
    enabled: !!user?.id,
  });

  const connections = data?.active || [];
  const pendingConnections = data?.pending || [];
  const connection =
    connections.find((c) => c.is_primary) || connections[0] || null;

  const isLoading = connectionLoading || profileLoading;
  const isConnected = connections.length > 0;
  const hasPendingRequest = pendingConnections.length > 0;

  let status: AtletaStatus = 'libero';
  if (isConnected) status = 'collegato';
  else if (hasPendingRequest) status = 'pending';

  const ptName = buildCoachFullName(
    connection?.profiles?.first_name,
    connection?.profiles?.last_name,
  );
  const ptInitials = getCoachInitials(
    connection?.profiles?.first_name,
    connection?.profiles?.last_name,
  );
  const ptAvatarUrl = connection?.profiles?.avatar_url || null;

  const pendingInvitationFromPT = pendingConnections.some(
    (c) => !!c.requested_by && c.requested_by === c.pt_user_id,
  );

  const isCoachingActive = connections.some((c) => c.is_pt_active !== false);
  const isCoachingPaused = !!connection && connection.is_pt_active === false;
  const canAccessWorkouts = isCoachingActive;
  const canAccessChat = isConnected;
  const canAccessProgress = true;
  const canSearchPT = true; // multi-PT: sempre possibile cercare altri coach

  const isConnectedToPt = (ptUserId: string | null | undefined) =>
    !!ptUserId && connections.some((c) => c.pt_user_id === ptUserId);

  const canTrainWithPt = (ptUserId: string | null | undefined) =>
    !!ptUserId &&
    connections.some((c) => c.pt_user_id === ptUserId && c.is_pt_active !== false);

  return {
    status,
    connection,
    connections,
    pendingConnections,
    profile,
    isLoading,
    isConnected,
    hasPendingRequest,
    pendingInvitationFromPT,
    ptName,
    ptInitials,
    ptAvatarUrl,
    isCoachingActive,
    isCoachingPaused,
    canAccessWorkouts,
    canAccessChat,
    canAccessProgress,
    canSearchPT,
    isConnectedToPt,
    canTrainWithPt,
    refetch: refetchConnection,
  };
}

export default useAtletaStatus;
