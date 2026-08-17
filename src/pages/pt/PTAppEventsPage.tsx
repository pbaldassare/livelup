import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Calendar,
  Loader2,
  MapPin,
  MessageCircle,
  Plus,
  Users,
} from 'lucide-react';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';
import { CreatePublicEventDialog } from '@/components/pt/CreatePublicEventDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { countEventParticipants } from '@/lib/api/eventParticipants';
import { countEventComments } from '@/lib/api/eventComments';
import { cn } from '@/lib/utils';

type EventFilter = 'all' | 'upcoming' | 'past';

type ManageEventRow = {
  id: string;
  title: string;
  start_datetime: string;
  location: string | null;
  is_cancelled: boolean;
};

function eventStatus(event: ManageEventRow): {
  label: string;
  className: string;
} {
  if (event.is_cancelled) {
    return {
      label: 'Cancellato',
      className: 'bg-destructive/15 text-destructive border-destructive/30',
    };
  }
  const start = new Date(event.start_datetime);
  if (start >= new Date()) {
    return {
      label: 'In programma',
      className: 'bg-app-accent/15 text-app-accent border-app-accent/30',
    };
  }
  return {
    label: 'Passato',
    className: 'bg-app-muted text-app-muted-foreground border-app-border',
  };
}

export function PTAppEventsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<EventFilter>('upcoming');
  const [showCreate, setShowCreate] = useState(false);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['pt-events-manage', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('calendar_events')
        .select('id, title, start_datetime, location, is_cancelled')
        .eq('pt_user_id', user.id)
        .eq('category', 'evento')
        .order('start_datetime', { ascending: false });
      if (error) throw error;
      return (data || []) as ManageEventRow[];
    },
    enabled: !!user?.id,
  });

  const eventIds = events.map((e) => e.id);

  const { data: participantCounts = {} } = useQuery({
    queryKey: ['event-participant-counts', eventIds],
    queryFn: () => countEventParticipants(eventIds),
    enabled: eventIds.length > 0,
  });

  const { data: commentCounts = {} } = useQuery({
    queryKey: ['event-comment-counts', eventIds],
    queryFn: () => countEventComments(eventIds),
    enabled: eventIds.length > 0,
  });

  const filteredEvents = useMemo(() => {
    const now = new Date();
    return events.filter((e) => {
      if (filter === 'all') return true;
      const start = new Date(e.start_datetime);
      if (filter === 'upcoming') return start >= now && !e.is_cancelled;
      return start < now || e.is_cancelled;
    });
  }, [events, filter]);

  return (
    <PTAppPageShell
      title="Eventi"
      description="Eventi pubblici che organizzi"
      showBack
      backTo="/pt/app"
      actions={
        <Button
          size="sm"
          onClick={() => setShowCreate(true)}
          className="bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
        >
          <Plus className="h-4 w-4 mr-1" />
          Crea
        </Button>
      }
    >
      <CreatePublicEventDialog open={showCreate} onOpenChange={setShowCreate} />

      <div className="space-y-4 px-1">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as EventFilter)}>
          <TabsList className="w-full grid grid-cols-3 bg-app-card border border-app-border">
            <TabsTrigger value="upcoming" className="text-xs sm:text-sm">
              In programma
            </TabsTrigger>
            <TabsTrigger value="past" className="text-xs sm:text-sm">
              Passati
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs sm:text-sm">
              Tutti
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <p className="text-xs text-app-muted-foreground px-1">
          {filteredEvents.length} event{filteredEvents.length === 1 ? 'o' : 'i'}
        </p>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-app-muted-foreground" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Nessun evento"
            description={
              filter === 'upcoming'
                ? 'Non hai eventi in programma. Creane uno per iniziare.'
                : filter === 'past'
                  ? 'Nessun evento passato o cancellato.'
                  : 'Non hai ancora creato eventi pubblici.'
            }
            actionLabel="Crea evento"
            onAction={() => setShowCreate(true)}
            className="text-app-foreground [&_h3]:text-app-foreground [&_p]:text-app-muted-foreground"
            iconClassName="text-app-muted-foreground"
          />
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((event) => {
              const counts = participantCounts[event.id] ?? {
                registered: 0,
                waitlist: 0,
              };
              const comments = commentCounts[event.id] ?? 0;
              const status = eventStatus(event);
              const start = new Date(event.start_datetime);

              return (
                <Link key={event.id} to={`/pt/app/events/${event.id}`} className="block">
                  <Card className="bg-app-card border-app-border active:scale-[0.99] transition-transform">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-app-foreground leading-snug line-clamp-2">
                          {event.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className={cn('shrink-0 text-[10px]', status.className)}
                        >
                          {status.label}
                        </Badge>
                      </div>

                      <div className="space-y-1.5 text-sm text-app-muted-foreground">
                        <p className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-app-accent" />
                          <span className="capitalize">
                            {format(start, 'EEEE d MMM yyyy, HH:mm', { locale: it })}
                          </span>
                        </p>
                        {event.location && (
                          <p className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-app-accent" />
                            <span className="truncate">{event.location}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <Badge
                          variant="secondary"
                          className="gap-1 bg-app-muted text-app-foreground border-0"
                        >
                          <Users className="h-3 w-3" />
                          {counts.registered}
                          {counts.waitlist > 0 && (
                            <span className="text-app-muted-foreground">
                              +{counts.waitlist}
                            </span>
                          )}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="gap-1 border-app-border text-app-muted-foreground"
                        >
                          <MessageCircle className="h-3 w-3" />
                          {comments}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        type="button"
        onClick={() => setShowCreate(true)}
        className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full bg-app-accent text-app-accent-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Crea evento"
      >
        <Plus className="h-6 w-6" />
      </button>
    </PTAppPageShell>
  );
}

export default PTAppEventsPage;
