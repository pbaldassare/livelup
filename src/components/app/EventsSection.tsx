import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ListSkeleton } from '@/components/skeletons';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PublicEventCard } from './PublicEventCard';
import { CalendarDays, PartyPopper, MapPin } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface PublicEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  event_type_name?: string;
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
  visibility: string;
  is_closed_number: boolean;
  max_participants: number | null;
}

interface EventsSectionProps {
  isConnected?: boolean;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export function EventsSection({ isConnected = false }: EventsSectionProps) {
  const { user } = useAuth();
  const [maxDistance, setMaxDistance] = useState(100);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // silently fail
      );
    }
  }, []);

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
          event_type_id,
          start_datetime,
          end_datetime,
          location,
          location_lat,
          location_lng,
          creator_user_id,
          visibility,
          is_closed_number,
          max_participants
        `)
        .eq('is_public', true)
        .eq('is_cancelled', false)
        .gte('start_datetime', new Date().toISOString())
        .order('start_datetime', { ascending: true })
        .limit(20);

      if (error) throw error;

      // For each event, fetch organizer profile and participant count
      // Fetch event type names
      const eventTypeIds = [...new Set((eventsData || []).map(e => e.event_type_id).filter(Boolean))];
      let eventTypeMap: Record<string, string> = {};
      if (eventTypeIds.length > 0) {
        const { data: etData } = await supabase
          .from('event_types')
          .select('id, name')
          .in('id', eventTypeIds);
        if (etData) {
          etData.forEach(et => { eventTypeMap[et.id] = et.name; });
        }
      }

      // Check user connection for visibility filtering
      let connectedPtIds: string[] = [];
      if (user) {
        const { data: connections } = await supabase
          .from('pt_atleta_connections')
          .select('pt_user_id')
          .eq('atleta_user_id', user.id)
          .eq('status', 'active');
        connectedPtIds = (connections || []).map(c => c.pt_user_id);
      }

      const eventsWithDetails: PublicEvent[] = await Promise.all(
        (eventsData || [])
          .filter(event => {
            // Visibility filter
            const vis = (event as any).visibility || 'public';
            if (vis === 'public') return true;
            if (vis === 'app_users') return !!user;
            if (vis === 'connected_only') return connectedPtIds.includes(event.creator_user_id);
            return true;
          })
          .map(async (event) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('user_id', event.creator_user_id)
            .maybeSingle();

          const { count } = await supabase
            .from('event_participants')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('status', 'registered');

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
            event_type: event.event_type as string,
            event_type_name: event.event_type_id ? eventTypeMap[event.event_type_id] : undefined,
            start_datetime: event.start_datetime,
            end_datetime: event.end_datetime,
            location: event.location,
            location_lat: event.location_lat,
            location_lng: event.location_lng,
            organizer: profile,
            participant_count: count || 0,
            is_registered: isRegistered,
            visibility: (event as any).visibility || 'public',
            is_closed_number: (event as any).is_closed_number || false,
            max_participants: (event as any).max_participants || null,
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

      {/* Distance filter */}
      {userLocation && (
        <div className="flex items-center gap-3">
          <MapPin className="h-4 w-4 text-app-muted-foreground shrink-0" />
          <div className="flex-1">
            <Slider
              value={[maxDistance]}
              onValueChange={([v]) => setMaxDistance(v)}
              min={5}
              max={200}
              step={5}
            />
          </div>
          <span className="text-xs text-app-muted-foreground whitespace-nowrap w-14 text-right">{maxDistance} km</span>
        </div>
      )}

      <p className="text-sm text-app-muted-foreground">
        {(() => {
          if (!events) return '0 eventi in programma';
          const filtered = userLocation
            ? events.filter(e => !e.location_lat || !e.location_lng || haversineDistance(userLocation.lat, userLocation.lng, e.location_lat, e.location_lng) <= maxDistance)
            : events;
          return `${filtered.length} eventi in programma`;
        })()}
      </p>

      {isLoading ? (
        <ListSkeleton count={3} type="event" />
      ) : events && events.length > 0 ? (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {(userLocation
              ? events.filter(e => !e.location_lat || !e.location_lng || haversineDistance(userLocation.lat, userLocation.lng, e.location_lat, e.location_lng) <= maxDistance)
              : events
            ).map((event, index) => (
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
