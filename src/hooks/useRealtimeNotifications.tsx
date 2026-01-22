import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// =====================================================
// HOOK: Realtime Notifications & Connections
// Subscribes to database changes for instant updates
// =====================================================

interface RealtimeNotificationPayload {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

interface RealtimeConnectionPayload {
  id: string;
  pt_user_id: string;
  atleta_user_id: string;
  status: string;
  requested_by: string | null;
  accepted_at: string | null;
  created_at: string;
}

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Handle new notification
  const handleNewNotification = useCallback((payload: RealtimeNotificationPayload) => {
    // Show toast notification
    const icon = getNotificationIcon(payload.type);
    
    toast(payload.title, {
      description: payload.body || undefined,
      icon,
      action: payload.action_url ? {
        label: 'Vedi',
        onClick: () => {
          window.location.href = payload.action_url!;
        },
      } : undefined,
    });

    // Invalidate notifications query to refresh the list
    queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
  }, [queryClient, user?.id]);

  // Handle connection status change
  const handleConnectionChange = useCallback((payload: RealtimeConnectionPayload, eventType: string) => {
    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: ['atleta-status', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['pt-athletes'] });
    queryClient.invalidateQueries({ queryKey: ['atleta-connection'] });
    queryClient.invalidateQueries({ queryKey: ['connection-request'] });
    
    // Show inline feedback for status changes (notification will come from DB trigger)
    if (eventType === 'UPDATE') {
      const status = payload.status;
      
      // Only show toast for relevant status changes
      if (status === 'active' && payload.atleta_user_id === user?.id) {
        toast.success('Connessione attivata!', {
          description: 'Il PT ha accettato la tua richiesta.',
        });
      } else if (status === 'rifiutato' && payload.atleta_user_id === user?.id) {
        toast.error('Richiesta rifiutata', {
          description: 'Il PT non ha accettato la connessione.',
        });
      }
    }
  }, [queryClient, user?.id]);

  // Subscribe to realtime channels
  useEffect(() => {
    if (!user?.id) return;

    // Channel for notifications
    const notificationsChannel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          handleNewNotification(payload.new as RealtimeNotificationPayload);
        }
      )
      .subscribe();

    // Channel for connections (for the current user)
    const connectionsChannel = supabase
      .channel(`connections:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pt_atleta_connections',
          filter: `atleta_user_id=eq.${user.id}`,
        },
        (payload) => {
          handleConnectionChange(
            payload.new as RealtimeConnectionPayload,
            payload.eventType
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pt_atleta_connections',
          filter: `pt_user_id=eq.${user.id}`,
        },
        (payload) => {
          handleConnectionChange(
            payload.new as RealtimeConnectionPayload,
            payload.eventType
          );
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(connectionsChannel);
    };
  }, [user?.id, handleNewNotification, handleConnectionChange]);
}

// Get icon for notification type
function getNotificationIcon(type: string): string {
  const icons: Record<string, string> = {
    connection_request: '🤝',
    connection_accepted: '✅',
    connection_rejected: '❌',
    message: '💬',
    workout: '💪',
    event: '📅',
    payment: '💳',
    badge: '🏆',
  };
  return icons[type] || '🔔';
}

export default useRealtimeNotifications;
