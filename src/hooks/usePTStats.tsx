import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface PTStats {
  active_athletes: number;
  pending_requests: number;
  total_workouts: number;
  completed_workouts: number;
  unread_messages: number;
  upcoming_events: number;
}

export function usePTStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pt-stats', user?.id],
    queryFn: async (): Promise<PTStats> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.rpc('get_pt_stats', {
        _pt_user_id: user.id,
      });

      if (error) {
        console.error('Error fetching PT stats:', error);
        throw error;
      }

      // Handle the case where data is an array
      const stats = Array.isArray(data) ? data[0] : data;
      
      return {
        active_athletes: stats?.active_athletes ?? 0,
        pending_requests: stats?.pending_requests ?? 0,
        total_workouts: stats?.total_workouts ?? 0,
        completed_workouts: stats?.completed_workouts ?? 0,
        unread_messages: stats?.unread_messages ?? 0,
        upcoming_events: stats?.upcoming_events ?? 0,
      };
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
}

export default usePTStats;
