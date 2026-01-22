import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// =====================================================
// HOOK: PT Connection Requests Management
// For PTs to accept/reject incoming connection requests
// =====================================================

export interface ConnectionRequest {
  id: string;
  pt_user_id: string;
  atleta_user_id: string;
  status: string;
  requested_by: string | null;
  requested_at: string;
  accepted_at: string | null;
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  atleta_profiles: {
    fitness_level: string | null;
    goals: string[] | null;
    level: string | null;
  } | null;
}

export function usePTConnectionRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch pending requests
  const { data: pendingRequests = [], isLoading } = useQuery({
    queryKey: ['pt-pending-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // First get the connections
      const { data: connections, error } = await supabase
        .from('pt_atleta_connections')
        .select('*')
        .eq('pt_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!connections?.length) return [];

      // Then fetch profiles and atleta_profiles for each connection
      const enrichedRequests = await Promise.all(
        connections.map(async (conn) => {
          const [{ data: profile }, { data: atletaProfile }] = await Promise.all([
            supabase
              .from('profiles')
              .select('first_name, last_name, email, avatar_url')
              .eq('user_id', conn.atleta_user_id)
              .single(),
            supabase
              .from('atleta_profiles')
              .select('fitness_level, goals, level')
              .eq('user_id', conn.atleta_user_id)
              .single(),
          ]);

          return {
            ...conn,
            profiles: profile,
            atleta_profiles: atletaProfile,
          } as ConnectionRequest;
        })
      );

      return enrichedRequests;
    },
    enabled: !!user?.id,
  });

  // Accept request mutation
  const acceptMutation = useMutation({
    mutationFn: async (request: ConnectionRequest) => {
      // Update connection status
      const { error } = await supabase
        .from('pt_atleta_connections')
        .update({
          status: 'active',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (error) throw error;

      // Get PT name for notification
      const { data: ptProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user?.id)
        .single();

      const ptName = ptProfile
        ? `${ptProfile.first_name || ''} ${ptProfile.last_name || ''}`.trim() || 'Il tuo PT'
        : 'Il tuo PT';

      // Create notification for athlete
      await supabase.from('notifications').insert({
        user_id: request.atleta_user_id,
        type: 'connection_accepted',
        title: 'Richiesta accettata! 🎉',
        body: `${ptName} ha accettato la tua richiesta. Inizia il tuo percorso di allenamento!`,
        action_url: '/app',
        data: { connection_id: request.id, pt_user_id: user?.id },
      });

      return request;
    },
    onSuccess: (request) => {
      const name = request.profiles
        ? `${request.profiles.first_name || ''} ${request.profiles.last_name || ''}`.trim()
        : 'Atleta';
      
      toast.success(`Connessione con ${name} attivata!`);
      
      queryClient.invalidateQueries({ queryKey: ['pt-pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pt-athletes'] });
      queryClient.invalidateQueries({ queryKey: ['pt-stats'] });
    },
    onError: () => {
      toast.error('Errore durante l\'accettazione');
    },
  });

  // Reject request mutation
  const rejectMutation = useMutation({
    mutationFn: async (request: ConnectionRequest) => {
      const { error } = await supabase
        .from('pt_atleta_connections')
        .update({ status: 'rifiutato' })
        .eq('id', request.id);

      if (error) throw error;

      // Create notification for athlete
      await supabase.from('notifications').insert({
        user_id: request.atleta_user_id,
        type: 'connection_rejected',
        title: 'Richiesta non accettata',
        body: 'Il Personal Trainer non può accettare nuove connessioni al momento.',
        action_url: '/app/discover',
        data: { pt_user_id: user?.id },
      });

      return request;
    },
    onSuccess: () => {
      toast.info('Richiesta rifiutata');
      queryClient.invalidateQueries({ queryKey: ['pt-pending-requests'] });
    },
    onError: () => {
      toast.error('Errore durante il rifiuto');
    },
  });

  return {
    pendingRequests,
    pendingCount: pendingRequests.length,
    isLoading,
    acceptRequest: acceptMutation.mutate,
    rejectRequest: rejectMutation.mutate,
    isAccepting: acceptMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
}

export default usePTConnectionRequests;
