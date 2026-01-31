import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ListSkeleton } from '@/components/skeletons';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PublicEventCard } from './PublicEventCard';
import { CalendarDays, PartyPopper } from 'lucide-react';

interface EventsSectionProps {
  isConnected?: boolean;
}

interface PublicEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: 'raduno' | 'evento' | 'gara' | 'allenamento' | 'altro';
  start_datetime: string;
  end_datetime: string | null;
  location: string | null;
  location_lat: number | null;
  location_lng: number | null;
  organizer: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
  participant_count: number;
  is_registered: boolean;
}

export function EventsSection({ isConnected = false }: EventsSectionProps) {
  const { user } = useAuth();

  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ['public-events-discover', user?.id],
    queryFn: async () => {
      // Fetch public events
      const { data: eventsData, error } = await supabase
        .from('calendar_events')
        .select(`
          id,
          title,
          description,
          event_type,
          start_datetime,
          end_datetime,
          location,
          location_lat,
          location_lng,
          creator_user_id
        `)
        .eq('is_public', true)
        .eq('is_cancelled', false)
        .gte('start_datetime', new Date().toISOString())
        .order('start_datetime', { ascending: true })
        .limit(20);

      if (error) throw error;

      // For each event, fetch organizer profile and participant count
      const eventsWithDetails: PublicEvent[] = await Promise.all(
        (eventsData || []).map(async (event) => {
          // Get organizer profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('user_id', event.creator_user_id)
            .maybeSingle();

          // Get participant count
          const { count } = await supabase
            .from('event_participants')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('status', 'registered');

          // Check if current user is registered
          let isRegistered = false;
          if (user) {
            const { data: registration } = await supabase
              .from('event_participants')
              .select('id')
              .eq('event_id', event.id)
              .eq('user_id', user.id)
              .eq('status', 'registered')
              .maybeSingle();
            isRegistered = !!registration;
          }

          return {
            id: event.id,
            title: event.title,
            description: event.description,
            event_type: event.event_type as PublicEvent['event_type'],
            start_datetime: event.start_datetime,
            end_datetime: event.end_datetime,
            location: event.location,
            location_lat: event.location_lat,
            location_lng: event.location_lng,
            organizer: profile,
            participant_count: count || 0,
            is_registered: isRegistered,
          };
        })
      );

      return eventsWithDetails;
    },
  });

  return (
    <div className="space-y-4">
      {/* Banner per atleti connessi */}
      {isConnected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-app-accent/20 to-app-accent/5 rounded-xl p-4 border border-app-accent/30"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-app-accent rounded-lg">
              <PartyPopper className="h-5 w-5 text-app-accent-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-app-foreground">Sei collegato a un PT!</h2>
              <p className="text-sm text-app-muted-foreground mt-1">
                Esplora gli eventi della community e partecipa!
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <p className="text-sm text-app-muted-foreground">
        {events?.length || 0} eventi in programma
      </p>

      {isLoading ? (
        <ListSkeleton count={3} type="event" />
      ) : events && events.length > 0 ? (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <PublicEventCard 
                  event={event} 
                  onRegistrationChange={refetch}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 bg-app-card rounded-xl border border-app-border"
        >
          <CalendarDays className="h-12 w-12 mx-auto text-app-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-app-foreground mb-2">
            Nessun evento in programma
          </h3>
          <p className="text-sm text-app-muted-foreground">
            I prossimi eventi appariranno qui
          </p>
        </motion.div>
      )}
    </div>
  );
}
