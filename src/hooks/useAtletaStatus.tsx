// =====================================================
// HOOK: Stato Atleta - Connection & Feature Gating
// Gestisce stato connessione e accesso funzionalità
// =====================================================

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { buildCoachFullName, getCoachInitials } from '@/lib/coachName';

export type AtletaStatus = 'libero' | 'pending' | 'collegato';

interface AtletaConnection {
  id: string;
  pt_user_id: string;
  status: string;
  accepted_at: string | null;
  requested_by: string | null;
  is_pt_active?: boolean | null;
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
  /** Nome reale del Coach (first_name + last_name validati). Null se incoerente. */
  ptName: string | null;
  /** Iniziali calcolate dal nome reale (es. "MR"). "?" se mancano. */
  ptInitials: string;
  ptAvatarUrl: string | null;
  /** Collaborazione col PT attiva (non messa in pausa dal PT) */
  isCoachingActive: boolean;
  /** Collaborazione messa in pausa dal PT: solo chat disponibile */
  isCoachingPaused: boolean;
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
      let { data: rows, error } = await supabase
        .from('pt_atleta_connections')
        .select('id, pt_user_id, status, accepted_at, requested_by, is_pt_active' as '*')
        .eq('atleta_user_id', user.id)
        .in('status', ['active', 'pending'])
        .order('created_at', { ascending: false });

      // Fallback se la colonna is_pt_active non è (ancora) disponibile
      if (error && (error.message || '').includes('is_pt_active')) {
        const fallback = await supabase
          .from('pt_atleta_connections')
          .select('id, pt_user_id, status, accepted_at, requested_by')
          .eq('atleta_user_id', user.id)
          .in('status', ['active', 'pending'])
          .order('created_at', { ascending: false });
        rows = fallback.data as typeof rows;
        error = fallback.error;
      }

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

  // PT name helper — usa nome reale validato (no placeholder come "coach", "pt", ecc.)
  const ptName = buildCoachFullName(
    connection?.profiles?.first_name,
    connection?.profiles?.last_name,
  );
  const ptInitials = getCoachInitials(
    connection?.profiles?.first_name,
    connection?.profiles?.last_name,
  );
  const ptAvatarUrl = connection?.profiles?.avatar_url || null;

  // True quando la richiesta pending è stata inviata dal PT (non dall'atleta)
  const pendingInvitationFromPT =
    hasPendingRequest &&
    !!connection?.requested_by &&
    connection.requested_by === connection.pt_user_id;

  // Feature gating based on connection status
  const isCoachingActive = isConnected && connection?.is_pt_active !== false;
  const isCoachingPaused = isConnected && connection?.is_pt_active === false;
  const canAccessWorkouts = isCoachingActive;
  const canAccessChat = isConnected; // la chat resta sempre disponibile se collegato
  const canAccessProgress = true; // Basic progress always available
  const canSearchPT = !isConnected; // Can search only if not connected

  return {
    status,
    connection,
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
    refetch: refetchConnection,
  };
}

export default useAtletaStatus;
