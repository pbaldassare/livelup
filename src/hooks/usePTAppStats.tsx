// =====================================================
// HOOK: PT App Stats - Mobile/PWA Stats
// Statistiche rapide per app mobile PT
// =====================================================

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface PTAppStats {
  activeAthletes: number;
  pendingRequests: number;
  todayEvents: number;
  unreadMessages: number;
  inactiveAthletes: number;
}

export function usePTAppStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pt-app-stats', user?.id],
    queryFn: async (): Promise<PTAppStats> => {
      if (!user?.id) {
        return {
          activeAthletes: 0,
          pendingRequests: 0,
          todayEvents: 0,
          unreadMessages: 0,
          inactiveAthletes: 0,
        };
      }

      // Fetch active athletes count
      const { count: activeCount } = await supabase
        .from('pt_atleta_connections')
        .select('*', { count: 'exact', head: true })
        .eq('pt_user_id', user.id)
        .eq('status', 'active');

      // Fetch pending requests
      const { count: pendingCount } = await supabase
        .from('pt_atleta_connections')
        .select('*', { count: 'exact', head: true })
        .eq('pt_user_id', user.id)
        .eq('status', 'pending');

      // Fetch today's events
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const { count: eventsCount } = await supabase
        .from('calendar_events')
        .select('*', { count: 'exact', head: true })
        .eq('pt_user_id', user.id)
        .gte('start_datetime', startOfDay)
        .lte('start_datetime', endOfDay)
        .eq('is_cancelled', false);

      // Fetch unread messages
      const { data: chats } = await supabase
        .from('chats')
        .select('id')
        .eq('pt_user_id', user.id)
        .eq('is_active', true);

      let unreadCount = 0;
      if (chats && chats.length > 0) {
        const chatIds = chats.map(c => c.id);
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('chat_id', chatIds)
          .neq('sender_user_id', user.id)
          .eq('is_read', false);
        unreadCount = count || 0;
      }

      return {
        activeAthletes: activeCount || 0,
        pendingRequests: pendingCount || 0,
        todayEvents: eventsCount || 0,
        unreadMessages: unreadCount,
        inactiveAthletes: 0, // TODO: implement inactive detection
      };
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export default usePTAppStats;
