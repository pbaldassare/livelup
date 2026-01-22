import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { requestConnection } from '@/lib/api/connections';

// =====================================================
// HOOK: Connection Request Management
// Handles sending, checking, and managing connection requests
// =====================================================

interface ConnectionRequestParams {
  ptUserId: string;
  origin?: 'ricerca' | 'invito' | 'referral' | 'qr';
}

export function useConnectionRequest(ptUserId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if there's an existing request
  const { data: existingRequest, isLoading: isCheckingRequest } = useQuery({
    queryKey: ['connection-request', user?.id, ptUserId],
    queryFn: async () => {
      if (!user?.id || !ptUserId) return null;

      const { data, error } = await supabase
        .from('pt_atleta_connections')
        .select('*')
        .eq('atleta_user_id', user.id)
        .eq('pt_user_id', ptUserId)
        .in('status', ['pending', 'active'])
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!ptUserId,
  });

  // Send connection request mutation
  const sendRequestMutation = useMutation({
    mutationFn: async ({ ptUserId, origin = 'ricerca' }: ConnectionRequestParams) => {
      if (!user?.id) throw new Error('Utente non autenticato');

      // Create connection request
      const connection = await requestConnection({
        ptUserId,
        atletaUserId: user.id,
        requestedBy: user.id,
        origin,
      });

      // Get athlete name for notification
      const { data: atletaProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .single();

      const atletaName = atletaProfile
        ? `${atletaProfile.first_name || ''} ${atletaProfile.last_name || ''}`.trim() || 'Un atleta'
        : 'Un atleta';

      // Create notification for PT
      await supabase.from('notifications').insert({
        user_id: ptUserId,
        type: 'connection_request',
        title: 'Nuova richiesta di connessione',
        body: `${atletaName} vuole connettersi con te come Personal Trainer.`,
        action_url: '/pt/app/athletes',
        data: { connection_id: connection.id, atleta_user_id: user.id },
      });

      return connection;
    },
    onSuccess: () => {
      toast.success('Richiesta inviata!', {
        description: 'Riceverai una notifica quando il PT risponderà.',
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['connection-request'] });
      queryClient.invalidateQueries({ queryKey: ['atleta-status'] });
    },
    onError: (error: Error) => {
      toast.error('Errore', {
        description: error.message,
      });
    },
  });

  // Cancel pending request
  const cancelRequestMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from('pt_atleta_connections')
        .delete()
        .eq('id', connectionId)
        .eq('status', 'pending');

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Richiesta annullata');
      queryClient.invalidateQueries({ queryKey: ['connection-request'] });
      queryClient.invalidateQueries({ queryKey: ['atleta-status'] });
    },
    onError: () => {
      toast.error('Errore durante l\'annullamento');
    },
  });

  return {
    existingRequest,
    isCheckingRequest,
    isPending: existingRequest?.status === 'pending',
    isConnected: existingRequest?.status === 'active',
    sendRequest: sendRequestMutation.mutate,
    cancelRequest: cancelRequestMutation.mutate,
    isSending: sendRequestMutation.isPending,
    isCancelling: cancelRequestMutation.isPending,
  };
}

export default useConnectionRequest;
