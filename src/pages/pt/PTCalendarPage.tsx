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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { PlacesAutocomplete } from '@/components/app/PlacesAutocomplete';
import { ImageUpload } from '@/components/common/ImageUpload';
import { EditEventDialog } from '@/components/pt/EditEventDialog';
import { 
  Calendar as CalendarIcon, 
  Plus,
  Clock,
  MapPin,
  Eye,
  Users,
  Lock,
  Pencil,
  ImagePlus,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  event_type_id: string | null;
  start_datetime: string;
  end_datetime: string | null;
  location: string | null;
  location_lat: number | null;
  location_lng: number | null;
  is_public: boolean;
  creator_user_id: string;
  is_cancelled: boolean;
  visibility: string;
  is_closed_number: boolean;
  max_participants: number | null;
  cover_image_url: string | null;
}

export interface PTCalendarPageProps {
  mode?: 'eventi' | 'appuntamenti';
}

export function PTCalendarPage({ mode = 'eventi' }: PTCalendarPageProps = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_type_id: '',
    start_datetime: '',
    end_datetime: '',
    location: '',
    location_lat: null as number | null,
    location_lng: null as number | null,
    visibility: 'public',
    is_closed_number: false,
    max_participants: '' as number | '',
    cover_image_url: null as string | null,
  });
  const [locationSearch, setLocationSearch] = useState('');

  // Fetch event types from DB
  const { data: eventTypes = [] } = useQuery({
    queryKey: ['event-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch events filtered by category (evento o appuntamento)
  const { data: events = [] } = useQuery({
    queryKey: ['pt-calendar', user?.id, mode],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('pt_user_id', user.id)
        .eq('category', mode === 'appuntamenti' ? 'appuntamento' : 'evento')
        .eq('is_cancelled', false)
        .order('start_datetime', { ascending: true });
      if (error) throw error;
      return data as CalendarEvent[];
    },
    enabled: !!user?.id,
  });

  const handlePlaceSelect = (place: {
    name: string;
    formatted_address: string;
    geometry: { location: { lat: number; lng: number } };
  }) => {
    setNewEvent({
      ...newEvent,
      location: place.formatted_address || place.name,
      location_lat: place.geometry.location.lat,
      location_lng: place.geometry.location.lng,
    });
    setLocationSearch(place.name);
  };

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
          event_type: 'evento' as const,
          category: 'evento',
          event_type_id: newEvent.event_type_id || null,
          start_datetime: newEvent.start_datetime,
          end_datetime: newEvent.end_datetime || null,
          location: newEvent.location || null,
          location_lat: newEvent.location_lat,
          location_lng: newEvent.location_lng,
          is_public: true,
          visibility: newEvent.visibility,
          is_closed_number: newEvent.is_closed_number,
          max_participants: newEvent.is_closed_number && newEvent.max_participants ? Number(newEvent.max_participants) : null,
          cover_image_url: newEvent.cover_image_url,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['public-events'] });
      toast.success('Evento creato con successo');
      setIsCreateDialogOpen(false);
      resetNewEvent();
    },
    onError: () => {
      toast.error('Errore durante la creazione dell\'evento');
    },
  });

  const resetNewEvent = () => {
    setNewEvent({
      title: '', description: '', event_type_id: '', start_datetime: '', end_datetime: '',
      location: '', location_lat: null, location_lng: null, visibility: 'public',
      is_closed_number: false, max_participants: '', cover_image_url: null,
    });
    setLocationSearch('');
  };

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

  const datesWithEvents = events.map((event) => new Date(event.start_datetime));

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

  const getEventTypeName = (event: CalendarEvent) => {
    if (event.event_type_id) {
      const found = eventTypes.find(t => t.id === event.event_type_id);
      if (found) return found.name;
    }
    return event.event_type;
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
          {/* Cover Image */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Immagine copertina
            </Label>
            {newEvent.cover_image_url ? (
              <div className="relative group rounded-lg overflow-hidden border">
                <img src={newEvent.cover_image_url} alt="Cover" className="w-full h-32 object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <ImageUpload
                    bucket="event-covers"
                    filePath={`${user?.id}/${Date.now()}.{ext}`}
                    onUploadComplete={(url) => setNewEvent({ ...newEvent, cover_image_url: url })}
                    variant="inline"
                  >
                    <Button type="button" size="sm" variant="secondary">
                      <ImagePlus className="h-4 w-4 mr-1" />Cambia
                    </Button>
                  </ImageUpload>
                  <Button type="button" size="sm" variant="destructive" onClick={() => setNewEvent({ ...newEvent, cover_image_url: null })}>
                    <X className="h-4 w-4 mr-1" />Rimuovi
                  </Button>
                </div>
              </div>
            ) : (
              <ImageUpload
                bucket="event-covers"
                filePath={`${user?.id}/${Date.now()}.{ext}`}
                onUploadComplete={(url) => setNewEvent({ ...newEvent, cover_image_url: url })}
                variant="gallery"
                className="h-24"
              />
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="title">Titolo</Label>
            <Input
              id="title"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              placeholder="Es: Calisthenics Day Brescia"
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo Evento</Label>
            <Select
              value={newEvent.event_type_id}
              onValueChange={(value) => setNewEvent({ ...newEvent, event_type_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona tipo" />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
            <Label>
              <MapPin className="h-4 w-4 inline mr-1" />
              Luogo
            </Label>
            <PlacesAutocomplete
              value={locationSearch}
              onChange={setLocationSearch}
              onPlaceSelect={handlePlaceSelect}
              placeholder="Cerca indirizzo o luogo..."
            />
            {newEvent.location && (
              <p className="text-sm text-muted-foreground mt-1">📍 {newEvent.location}</p>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>
              <Eye className="h-4 w-4 inline mr-1" />
              Visibilità
            </Label>
            <Select
              value={newEvent.visibility}
              onValueChange={(value) => setNewEvent({ ...newEvent, visibility: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  <div className="flex items-center gap-2"><Eye className="h-4 w-4" />Aperto a tutti</div>
                </SelectItem>
                <SelectItem value="app_users">
                  <div className="flex items-center gap-2"><Users className="h-4 w-4" />Solo utenti app</div>
                </SelectItem>
                <SelectItem value="connected_only">
                  <div className="flex items-center gap-2"><Lock className="h-4 w-4" />Solo atleti collegati</div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="closed-web">Numero chiuso</Label>
                <p className="text-xs text-muted-foreground">Limita il numero di partecipanti</p>
              </div>
              <Switch
                id="closed-web"
                checked={newEvent.is_closed_number}
                onCheckedChange={(checked) => setNewEvent({ ...newEvent, is_closed_number: checked })}
              />
            </div>
            {newEvent.is_closed_number && (
              <div className="space-y-2">
                <Label htmlFor="maxP">Max partecipanti</Label>
                <Input
                  id="maxP"
                  type="number"
                  min={1}
                  value={newEvent.max_participants}
                  onChange={(e) => setNewEvent({ ...newEvent, max_participants: e.target.value ? parseInt(e.target.value) : '' })}
                  placeholder="Es: 20"
                />
              </div>
            )}
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

  const isAppuntamenti = mode === 'appuntamenti';
  const pageTitle = isAppuntamenti ? 'Calendario Appuntamenti' : 'Calendario Eventi';
  const pageDescription = isAppuntamenti
    ? 'Sessioni 1-a-1 prenotate dai tuoi atleti'
    : 'Open day, lezioni di gruppo e attività pubbliche';
  const itemLabel = isAppuntamenti ? 'appuntamenti' : 'eventi';

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title={pageTitle}
        description={pageDescription}
        icon={CalendarIcon}
        actions={isAppuntamenti ? null : createButton}
      />

      {/* Switch tra le due tipologie di calendario */}
      <div className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
        <Link
          to="/pt/calendar/eventi"
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            !isAppuntamenti ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Eventi
        </Link>
        <Link
          to="/pt/calendar/appuntamenti"
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            isAppuntamenti ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Appuntamenti
        </Link>
      </div>


      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Calendario</CardTitle>
            <CardDescription>Seleziona una data per vedere gli eventi</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={it}
              className="rounded-md border"
              modifiers={{ hasEvent: datesWithEvents }}
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

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedDate ? format(selectedDate, 'EEEE d MMMM', { locale: it }) : 'Seleziona una data'}
            </CardTitle>
            <CardDescription>{selectedDateEvents.length} eventi</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDateEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nessun evento per questa data</p>
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`p-3 rounded-lg border ${getEventTypeColor(event.event_type)} cursor-pointer hover:opacity-80 transition-opacity`}
                    onClick={() => event.creator_user_id === user?.id && setEditingEvent(event)}
                  >
                    {event.cover_image_url && (
                      <img src={event.cover_image_url} alt="" className="w-full h-20 object-cover rounded mb-2" />
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{event.title}</p>
                        {event.creator_user_id !== user?.id && (
                          <Badge variant="secondary" className="text-[10px]">Prenotato</Badge>
                        )}
                      </div>
                      {event.creator_user_id === user?.id && (
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
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

      <Card>
        <CardHeader>
          <CardTitle>Prossimi 7 Giorni</CardTitle>
          <CardDescription>{upcomingEvents.length} eventi in programma</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nessun evento nei prossimi 7 giorni</p>
          ) : (
            <div className="space-y-4">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => event.creator_user_id === user?.id && setEditingEvent(event)}
                >
                  {event.cover_image_url ? (
                    <img src={event.cover_image_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${getEventTypeColor(event.event_type)}`}>
                      <CalendarIcon className="h-5 w-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
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
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{getEventTypeName(event)}</Badge>
                    {event.creator_user_id === user?.id && (
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Event Dialog */}
      {editingEvent && (
        <EditEventDialog
          open={!!editingEvent}
          onOpenChange={(open) => !open && setEditingEvent(null)}
          event={editingEvent}
        />
      )}
    </div>
  );
}

export default PTCalendarPage;
