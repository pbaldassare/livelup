// =====================================================
// HOOK: Stato Atleta - Connection & Feature Gating
// Gestisce stato connessione e accesso funzionalità
// =====================================================

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export type AtletaStatus = 'libero' | 'pending' | 'collegato';

interface AtletaConnection {
  id: string;
  pt_user_id: string;
  status: string;
  accepted_at: string | null;
  requested_by: string | null;
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
  connection: AtletaConnection | null;
  profile: AtletaProfile | null;
  isLoading: boolean;
  isConnected: boolean;
  hasPendingRequest: boolean;
  /** True quando il PT ha invitato l'atleta (l'atleta deve accettare/rifiutare) */
  pendingInvitationFromPT: boolean;
  ptName: string | null;
  ptAvatarUrl: string | null;
  canAccessWorkouts: boolean;
  canAccessChat: boolean;
  canAccessProgress: boolean;
  canSearchPT: boolean;
  refetch: () => void;
}

export function useAtletaStatus(): UseAtletaStatusReturn {
  const { user } = useAuth();

  // Fetch current connection
  const { data: connection, isLoading: connectionLoading, refetch: refetchConnection } = useQuery({
    queryKey: ['atleta-connection', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Priorità: active > pending. Recuperiamo tutte le righe non terminate
      // e scegliamo manualmente per evitare ambiguità.
      const { data: rows, error } = await supabase
        .from('pt_atleta_connections')
        .select('id, pt_user_id, status, accepted_at, requested_by')
        .eq('atleta_user_id', user.id)
        .in('status', ['active', 'pending'])
        .order('created_at', { ascending: false });

      const data =
        rows?.find((r) => r.status === 'active') ||
        rows?.find((r) => r.status === 'pending') ||
        null;

      if (error) throw error;
      
      if (!data) return null;

      // Fetch PT profile separately
      const { data: ptProfile } = await supabase
        .from('pt_profiles')
        .select('bio, specializations, rating_avg, hourly_rate')
        .eq('user_id', data.pt_user_id)
        .single();

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('user_id', data.pt_user_id)
        .single();

      return {
        ...data,
        pt_profiles: ptProfile,
        profiles: profile,
      } as AtletaConnection;
    },
    enabled: !!user?.id,
  });

  // Fetch atleta profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['atleta-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('atleta_profiles')
        .select('id, fitness_level, goals, level, weight_kg, height_cm, status')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as AtletaProfile | null;
    },
    enabled: !!user?.id,
  });

  const isLoading = connectionLoading || profileLoading;
  const isConnected = connection?.status === 'active';
  const hasPendingRequest = connection?.status === 'pending';

  // Determine overall status
  let status: AtletaStatus = 'libero';
  if (isConnected) {
    status = 'collegato';
  } else if (hasPendingRequest) {
    status = 'pending';
  }

  // PT name helper
  const ptName = connection?.profiles
    ? `${connection.profiles.first_name || ''} ${connection.profiles.last_name || ''}`.trim() || null
    : null;

  // Feature gating based on connection status
  const canAccessWorkouts = isConnected;
  const canAccessChat = isConnected;
  const canAccessProgress = true; // Basic progress always available
  const canSearchPT = !isConnected; // Can search only if not connected

  return {
    status,
    connection,
    profile,
    isLoading,
    isConnected,
    hasPendingRequest,
    ptName,
    canAccessWorkouts,
    canAccessChat,
    canAccessProgress,
    canSearchPT,
    refetch: refetchConnection,
  };
}

export default useAtletaStatus;
