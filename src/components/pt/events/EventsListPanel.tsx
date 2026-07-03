import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Loader2, MapPin, MessageCircle, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { countEventParticipants } from '@/lib/api/eventParticipants';
import { countEventComments } from '@/lib/api/eventComments';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
} {
  if (event.is_cancelled) return { label: 'Cancellato', variant: 'destructive' };
  const start = new Date(event.start_datetime);
  if (start >= new Date()) return { label: 'In programma', variant: 'default' };
  return { label: 'Passato', variant: 'secondary' };
}

export function EventsListPanel() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<EventFilter>('upcoming');

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
    <div className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as EventFilter)}>
          <TabsList>
            <TabsTrigger value="upcoming">In programma</TabsTrigger>
            <TabsTrigger value="past">Passati</TabsTrigger>
            <TabsTrigger value="all">Tutti</TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="text-sm text-muted-foreground">
          {filteredEvents.length} event{filteredEvents.length === 1 ? 'o' : 'i'}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          Nessun evento in questa categoria
        </p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="hidden md:table-cell">Luogo</TableHead>
                <TableHead className="text-center">Iscritti</TableHead>
                <TableHead className="text-center">Commenti</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((event) => {
                const counts = participantCounts[event.id] ?? { registered: 0, waitlist: 0 };
                const comments = commentCounts[event.id] ?? 0;
                const status = eventStatus(event);
                const start = new Date(event.start_datetime);

                return (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {event.title}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(start, 'd MMM yyyy, HH:mm', { locale: it })}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[160px] truncate">
                      {event.location ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {event.location}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="gap-1">
                        <Users className="h-3 w-3" />
                        {counts.registered}
                        {counts.waitlist > 0 && (
                          <span className="text-muted-foreground">+{counts.waitlist}</span>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {comments}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/pt/events/${event.id}`}>Gestisci</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
