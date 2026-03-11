import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { 
  Calendar as CalendarIcon, 
  Plus,
  Clock,
  MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

// =====================================================
// PT CALENDAR PAGE - Calendario Appuntamenti
// Solo per ruolo: pt (web dashboard)
// =====================================================

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_datetime: string;
  end_datetime: string | null;
  location: string | null;
  is_public: boolean;
  atleta_user_id: string | null;
  creator_user_id: string;
  is_cancelled: boolean;
}

export function PTCalendarPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_type: 'allenamento',
    start_datetime: '',
    end_datetime: '',
    location: '',
    is_public: false,
    atleta_user_id: '',
  });

  // Fetch connected athletes for dropdown
  const { data: athletes = [] } = useQuery({
    queryKey: ['connected-athletes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('pt_atleta_connections')
        .select('atleta_user_id')
        .eq('pt_user_id', user.id)
        .eq('status', 'active');
      if (error) throw error;
      
      const enriched = await Promise.all(
        (data || []).map(async (conn) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', conn.atleta_user_id)
            .single();
          return { id: conn.atleta_user_id, name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() };
        })
      );
      return enriched;
    },
    enabled: !!user?.id,
  });

  // Fetch events
  const { data: events = [] } = useQuery({
    queryKey: ['pt-calendar', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('pt_user_id', user.id)
        .eq('is_cancelled', false)
        .order('start_datetime', { ascending: true });

      if (error) throw error;
      return data as CalendarEvent[];
    },
    enabled: !!user?.id,
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('calendar_events')
        .insert([{
          creator_user_id: user.id,
          pt_user_id: user.id,
          title: newEvent.title,
          description: newEvent.description || null,
          event_type: newEvent.event_type as 'allenamento' | 'raduno' | 'evento' | 'gara' | 'altro',
          start_datetime: newEvent.start_datetime,
          end_datetime: newEvent.end_datetime || null,
          location: newEvent.location || null,
          is_public: newEvent.is_public,
          atleta_user_id: newEvent.atleta_user_id || null,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-calendar'] });
      toast.success('Evento creato con successo');
      setIsCreateDialogOpen(false);
      setNewEvent({
        title: '',
        description: '',
        event_type: 'allenamento',
        start_datetime: '',
        end_datetime: '',
        location: '',
        is_public: false,
        atleta_user_id: '',
      });
    },
    onError: () => {
      toast.error('Errore durante la creazione dell\'evento');
    },
  });

  // Filter events for selected date
  const selectedDateEvents = events.filter((event) => {
    if (!selectedDate) return false;
    const eventDate = new Date(event.start_datetime);
    return (
      eventDate.getDate() === selectedDate.getDate() &&
      eventDate.getMonth() === selectedDate.getMonth() &&
      eventDate.getFullYear() === selectedDate.getFullYear()
    );
  });

  // Get dates with events for calendar highlighting
  const datesWithEvents = events.map((event) => new Date(event.start_datetime));

  // Upcoming events (next 7 days)
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingEvents = events.filter((event) => {
    const eventDate = new Date(event.start_datetime);
    return eventDate >= now && eventDate <= weekFromNow;
  });

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'allenamento': return 'bg-role-pt/10 text-role-pt border-role-pt/20';
      case 'appuntamento': return 'bg-info/10 text-info border-info/20';
      case 'evento': return 'bg-primary/10 text-primary border-primary/20';
      case 'gara': return 'bg-warning/10 text-warning border-warning/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const createButton = (
    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Evento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg w-[calc(100%-2rem)] sm:w-full max-h-[calc(100vh-2rem)] !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Crea Nuovo Evento</DialogTitle>
          <DialogDescription>
            Aggiungi un nuovo evento al calendario
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto pr-2">
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titolo</Label>
            <Input
              id="title"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              placeholder="Es: Sessione con Mario Rossi"
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo Evento</Label>
            <Select
              value={newEvent.event_type}
              onValueChange={(value) => setNewEvent({ ...newEvent, event_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="allenamento">Allenamento</SelectItem>
                <SelectItem value="raduno">Raduno</SelectItem>
                <SelectItem value="evento">Evento</SelectItem>
                <SelectItem value="gara">Gara</SelectItem>
                <SelectItem value="altro">Altro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {athletes.length > 0 && (
            <div className="space-y-2">
              <Label>Atleta (opzionale)</Label>
              <Select
                value={newEvent.atleta_user_id}
                onValueChange={(value) => setNewEvent({ ...newEvent, atleta_user_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona atleta..." />
                </SelectTrigger>
                <SelectContent>
                  {athletes.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start">Inizio</Label>
              <Input
                id="start"
                type="datetime-local"
                value={newEvent.start_datetime}
                onChange={(e) => setNewEvent({ ...newEvent, start_datetime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">Fine</Label>
              <Input
                id="end"
                type="datetime-local"
                value={newEvent.end_datetime}
                onChange={(e) => setNewEvent({ ...newEvent, end_datetime: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Luogo</Label>
            <Input
              id="location"
              value={newEvent.location}
              onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
              placeholder="Es: Palestra XYZ"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Note</Label>
            <Textarea
              id="description"
              value={newEvent.description}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              placeholder="Note aggiuntive..."
            />
          </div>
        </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
            Annulla
          </Button>
          <Button 
            onClick={() => createEventMutation.mutate()}
            disabled={!newEvent.title || !newEvent.start_datetime || createEventMutation.isPending}
          >
            Crea Evento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title="Calendario"
        description="Gestisci appuntamenti e sessioni di allenamento"
        icon={CalendarIcon}
        actions={createButton}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Calendario</CardTitle>
            <CardDescription>
              Seleziona una data per vedere gli eventi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={it}
              className="rounded-md border"
              modifiers={{
                hasEvent: datesWithEvents,
              }}
              modifiersStyles={{
                hasEvent: {
                  fontWeight: 'bold',
                  backgroundColor: 'hsl(var(--role-pt) / 0.1)',
                  borderRadius: '50%',
                },
              }}
            />
          </CardContent>
        </Card>

        {/* Selected Day Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedDate 
                ? format(selectedDate, 'EEEE d MMMM', { locale: it })
                : 'Seleziona una data'
              }
            </CardTitle>
            <CardDescription>
              {selectedDateEvents.length} eventi
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDateEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nessun evento per questa data
              </p>
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`p-3 rounded-lg border ${getEventTypeColor(event.event_type)}`}
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{event.title}</p>
                      {event.creator_user_id !== user?.id && (
                        <Badge variant="secondary" className="text-[10px]">Prenotato</Badge>
                      )}
                    </div>
                    <div className="mt-2 space-y-1 text-sm opacity-80">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {format(new Date(event.start_datetime), 'HH:mm')}
                        {event.end_datetime && ` - ${format(new Date(event.end_datetime), 'HH:mm')}`}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle>Prossimi 7 Giorni</CardTitle>
          <CardDescription>
            {upcomingEvents.length} eventi in programma
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nessun evento nei prossimi 7 giorni
            </p>
          ) : (
            <div className="space-y-4">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${getEventTypeColor(event.event_type)}`}>
                    <CalendarIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{event.title}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {format(new Date(event.start_datetime), 'EEE d MMM', { locale: it })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(event.start_datetime), 'HH:mm')}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Modifica
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PTCalendarPage;
