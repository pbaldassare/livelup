import { useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { RealtimeChannel } from '@supabase/supabase-js';

// =====================================================
// USE TEAMMATES HOOK - Gestione teammate e cheers
// Include: presenza real-time, invio cheers, conteggio
// =====================================================

export interface Teammate {
  id: string;
  name: string;
  avatarUrl?: string;
  initials?: string;
  cheers: number;
  isActive: boolean;
}

interface PresenceState {
  [key: string]: {
    user_id: string;
    online_at: string;
  }[];
}

export function useTeammates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [presenceChannel, setPresenceChannel] = useState<RealtimeChannel | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  // Fetch teammates (atleti collegati allo stesso PT)
  const { data: teammates = [], isLoading } = useQuery({
    queryKey: ['teammates', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // 1. Find current user's PT
      const { data: connection, error: connError } = await supabase
        .from('pt_atleta_connections')
        .select('pt_user_id')
        .eq('atleta_user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (connError || !connection) return [];

      // 2. Get all athletes connected to the same PT (excluding self)
      const { data: teammateConnections, error: teamError } = await supabase
        .from('pt_atleta_connections')
        .select('atleta_user_id')
        .eq('pt_user_id', connection.pt_user_id)
        .eq('status', 'active')
        .neq('atleta_user_id', user.id);

      if (teamError || !teammateConnections?.length) return [];

      const teammateIds = teammateConnections.map(c => c.atleta_user_id);

      // 3. Get profiles for teammates
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, avatar_url')
        .in('user_id', teammateIds);

      if (profError) throw profError;

      // 4. Get today's cheers count for each teammate
      const today = new Date().toISOString().split('T')[0];
      const { data: cheersData } = await supabase
        .from('cheers')
        .select('receiver_user_id')
        .in('receiver_user_id', teammateIds)
        .gte('created_at', today);

      // Count cheers per user
      const cheersCounts: Record<string, number> = {};
      cheersData?.forEach(cheer => {
        cheersCounts[cheer.receiver_user_id] = (cheersCounts[cheer.receiver_user_id] || 0) + 1;
      });

      return (profiles || []).map(profile => ({
        id: profile.user_id,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Atleta',
        avatarUrl: profile.avatar_url || undefined,
        initials: `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() || 'A',
        cheers: cheersCounts[profile.user_id] || 0,
        isActive: onlineUsers.has(profile.user_id),
      }));
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refresh every 30s
  });

  // Setup presence channel
  useEffect(() => {
    if (!user?.id) return;

    // Get PT connection first
    const setupPresence = async () => {
      const { data: connection } = await supabase
        .from('pt_atleta_connections')
        .select('pt_user_id')
        .eq('atleta_user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!connection) return;

      const channelName = `presence:pt:${connection.pt_user_id}`;
      
      const channel = supabase.channel(channelName);

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState() as PresenceState;
          const online = new Set<string>();
          Object.values(state).forEach(presences => {
            presences.forEach(presence => {
              online.add(presence.user_id);
            });
          });
          setOnlineUsers(online);
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          setOnlineUsers(prev => {
            const next = new Set(prev);
            newPresences.forEach((p) => {
              const presence = p as unknown as { user_id: string };
              if (presence.user_id) next.add(presence.user_id);
            });
            return next;
          });
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          setOnlineUsers(prev => {
            const next = new Set(prev);
            leftPresences.forEach((p) => {
              const presence = p as unknown as { user_id: string };
              if (presence.user_id) next.delete(presence.user_id);
            });
            return next;
          });
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              user_id: user.id,
              online_at: new Date().toISOString(),
            });
          }
        });

      setPresenceChannel(channel);
    };

    setupPresence();

    return () => {
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel);
      }
    };
  }, [user?.id]);

  // Subscribe to new cheers in real-time
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('cheers-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cheers',
        },
        (payload) => {
          // Refresh teammates to update cheer counts
          queryClient.invalidateQueries({ queryKey: ['teammates'] });
          
          // Show toast if we received a cheer
          if (payload.new.receiver_user_id === user.id) {
            toast.success('Hai ricevuto un incoraggiamento! ⚡', {
              duration: 3000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Send cheer to teammate
  const sendCheer = useCallback(async (receiverId: string) => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('cheers')
        .insert({
          sender_user_id: user.id,
          receiver_user_id: receiverId,
        });

      if (error) {
        console.error('Error sending cheer:', error);
        toast.error('Impossibile inviare incoraggiamento');
        return false;
      }

      toast.success('Incoraggiamento inviato! ⚡');
      queryClient.invalidateQueries({ queryKey: ['teammates'] });
      return true;
    } catch (err) {
      console.error('Error sending cheer:', err);
      return false;
    }
  }, [user?.id, queryClient]);

  // Update teammates with current online status
  const teammatesWithPresence: Teammate[] = teammates.map(t => ({
    ...t,
    isActive: onlineUsers.has(t.id),
  }));

  return {
    teammates: teammatesWithPresence,
    isLoading,
    sendCheer,
    onlineCount: onlineUsers.size,
  };
}

export default useTeammates;
