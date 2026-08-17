import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Dumbbell,
  Video,
  Plus,
  X,
  ChevronRight,
} from 'lucide-react';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';
import {
  AppCalendarView,
  itemDateKey,
  rangeKey,
  type AppCalendarItem,
  type AppCalendarVisibleRange,
} from '@/components/app/AppCalendarView';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CreatePublicEventDialog } from '@/components/pt/CreatePublicEventDialog';
import { PTAvailabilityManager } from '@/components/pt/PTAvailabilityManager';
import { GoogleCalendarConnectButton } from '@/components/pt/GoogleCalendarConnectButton';
import { syncAppointmentToGoogleCalendar } from '@/lib/api/googleCalendarSync';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ptRoutes } from '@/lib/pt/routes';

// =====================================================
// PT APP CALENDAR PAGE - Calendario (Mobile)
// Reuses shared AppCalendarView (Giorno / Settimana / Mese).
// =====================================================

const EVENT_TYPE_CONFIG = {
  allenamento: { label: 'Allenamento', icon: Dumbbell, color: 'bg-primary' },
  appuntamento: { label: 'Appuntamento', icon: Users, color: 'bg-info' },
  video_call: { label: 'Video call', icon: Video, color: 'bg-warning' },
  raduno: { label: 'Raduno', icon: Users, color: 'bg-lime-500' },
  evento: { label: 'Evento', icon: CalendarIcon, color: 'bg-violet-500' },
  gara: { label: 'Gara', icon: Dumbbell, color: 'bg-orange-500' },
  altro: { label: 'Altro', icon: CalendarIcon, color: 'bg-muted' },
};

type PtCalendarEvent = {
  id: string;
  title: string;
  start_datetime: string;
  end_datetime?: string | null;
  location?: string | null;
  event_type?: string | null;
  category?: string | null;
  atleta_user_id?: string | null;
  creator_user_id?: string | null;
  pt_user_id?: string | null;
  atletaProfile?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;
};

export function PTAppCalendarPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const appointmentsOnly = searchParams.get('view') === 'appuntamenti';
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [range, setRange] = useState<AppCalendarVisibleRange | null>(null);

  const onVisibleRangeChange = useCallback((next: AppCalendarVisibleRange) => {
    setRange(next);
  }, []);

  const onSelectedDateChange = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  const cancelMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('calendar_events')
        .update({ is_cancelled: true, cancelled_at: new Date().toISOString() })
        .eq('id', eventId);
      if (error) throw error;
      void syncAppointmentToGoogleCalendar(eventId, 'delete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-events'] });
      toast.success('Evento cancellato');
    },
    onError: () => toast.error('Errore nella cancellazione'),
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: [
      'pt-events',
      user?.id,
      range ? rangeKey(range.from, range.to) : null,
    ],
    queryFn: async () => {
      if (!user?.id || !range) return [] as PtCalendarEvent[];

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('pt_user_id', user.id)
        .eq('is_cancelled', false)
        .gte('start_datetime', range.from.toISOString())
        .lte('start_datetime', range.to.toISOString())
        .order('start_datetime', { ascending: true });

      if (error) throw error;

      const eventsWithProfiles = await Promise.all(
        (data || []).map(async (event) => {
          if (event.atleta_user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('user_id', event.atleta_user_id)
              .single();
            return { ...event, atletaProfile: profile } as PtCalendarEvent;
          }
          return event as PtCalendarEvent;
        }),
      );

      return eventsWithProfiles;
    },
    enabled: !!user?.id && !!range,
  });

  const visibleEvents = useMemo(
    () =>
      appointmentsOnly
        ? events.filter((e) => e.category === 'appuntamento')
        : events,
    [appointmentsOnly, events],
  );

  const eventsById = useMemo(() => {
    const m = new Map<string, PtCalendarEvent>();
    for (const e of visibleEvents) m.set(e.id, e);
    return m;
  }, [visibleEvents]);

  const items: AppCalendarItem[] = useMemo(
    () =>
      visibleEvents.map((event) => ({
        id: event.id,
        title: event.title,
        date: itemDateKey(event.start_datetime),
      })),
    [visibleEvents],
  );

  return (
    <PTAppPageShell
      title={appointmentsOnly ? 'Appuntamenti' : 'Calendario'}
      description={
        appointmentsOnly
          ? 'Solo appuntamenti con atleti'
          : 'Eventi e appuntamenti'
      }
      showBack
      flush
      actions={
        <div className="flex flex-wrap gap-2 justify-end">
          <GoogleCalendarConnectButton variant="app" />
          {!appointmentsOnly && (
            <Button
              size="sm"
              onClick={() => setShowCreateEvent(true)}
              className="bg-app-accent text-black hover:bg-app-accent/90"
            >
              <Plus className="h-4 w-4 mr-1" />
              Evento
            </Button>
          )}
        </div>
      }
    >
      <div data-tour="pt-calendar-page">
        <CreatePublicEventDialog
          open={showCreateEvent}
          onOpenChange={setShowCreateEvent}
          selectedDate={selectedDate}
        />

        <AppCalendarView
          hideTitle
          items={items}
          isLoading={isLoading}
          emptyLabel={
            appointmentsOnly
              ? 'Nessun appuntamento per questo giorno'
              : 'Nessun evento per questo giorno'
          }
          onVisibleRangeChange={onVisibleRangeChange}
          onSelectedDateChange={onSelectedDateChange}
          renderItem={(item) => {
            const event = eventsById.get(item.id);
            if (!event) return null;
            return (
              <EventCard
                event={event}
                onCancel={(id) => cancelMutation.mutate(id)}
              />
            );
          }}
          footer={<PTAvailabilityManager compact />}
        />
      </div>
    </PTAppPageShell>
  );
}

function EventCard({
  event,
  onCancel,
}: {
  event: PtCalendarEvent;
  onCancel: (id: string) => void;
}) {
  const navigate = useNavigate();
  const config =
    EVENT_TYPE_CONFIG[event.event_type as keyof typeof EVENT_TYPE_CONFIG] ||
    EVENT_TYPE_CONFIG.altro;
  const Icon = config.icon;
  const atletaName = event.atletaProfile
    ? `${event.atletaProfile.first_name || ''} ${event.atletaProfile.last_name || ''}`.trim()
    : null;
  const isBookedByAthlete =
    event.creator_user_id !== event.pt_user_id && event.atleta_user_id;
  const isPublicEvent = event.category === 'evento';

  const handleOpen = () => {
    if (isPublicEvent) {
      navigate(ptRoutes.app.event(event.id));
    }
  };

  return (
    <Card
      className={cn(
        'bg-app-card border-app-border',
        isPublicEvent && 'cursor-pointer active:scale-[0.99] transition-transform',
      )}
      onClick={isPublicEvent ? handleOpen : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center text-white',
              config.color,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-app-foreground">{event.title}</h3>
              {isBookedByAthlete && (
                <Badge variant="secondary" className="text-[10px]">
                  Prenotato
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-1 text-sm text-app-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(event.start_datetime), 'HH:mm')}
                {event.end_datetime &&
                  ` - ${format(new Date(event.end_datetime), 'HH:mm')}`}
              </span>

              {event.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {event.location}
                </span>
              )}
            </div>

            {atletaName && (
              <Badge variant="secondary" className="mt-2 text-xs">
                <Users className="h-3 w-3 mr-1" />
                {atletaName}
              </Badge>
            )}
          </div>

          {isPublicEvent ? (
            <ChevronRight className="h-5 w-5 text-app-muted-foreground shrink-0 mt-1" />
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-app-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onCancel(event.id);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default PTAppCalendarPage;
