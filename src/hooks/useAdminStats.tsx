import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AdminStats {
  total_pts: number;
  active_pts: number;
  pending_pts: number;
  suspended_pts: number;
  total_athletes: number;
  connected_athletes: number;
  premium_athletes: number;
  active_subscriptions: number;
  open_tickets: number;
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async (): Promise<AdminStats> => {
      const { data, error } = await supabase.rpc('get_admin_stats');

      if (error) {
        console.error('Error fetching admin stats:', error);
        throw error;
      }

      // Handle the case where data is an array
      const stats = Array.isArray(data) ? data[0] : data;
      
      return {
        total_pts: stats?.total_pts ?? 0,
        active_pts: stats?.active_pts ?? 0,
        pending_pts: stats?.pending_pts ?? 0,
        suspended_pts: stats?.suspended_pts ?? 0,
        total_athletes: stats?.total_athletes ?? 0,
        connected_athletes: stats?.connected_athletes ?? 0,
        premium_athletes: stats?.premium_athletes ?? 0,
        active_subscriptions: stats?.active_subscriptions ?? 0,
        open_tickets: stats?.open_tickets ?? 0,
      };
    },
    refetchInterval: 30000, // Refresh ogni 30 secondi
  });
}

export default useAdminStats;
