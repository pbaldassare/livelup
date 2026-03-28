import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Calendar,
  MapPin,
  Loader2,
  Eye,
  Lock,
  Users,
  ImagePlus,
  X,
  Trash2,
} from 'lucide-react';
import { PlacesAutocomplete } from '@/components/app/PlacesAutocomplete';
import { ImageUpload } from '@/components/common/ImageUpload';

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
  cover_image_url?: string | null;
}

interface EditEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent;
}

export function EditEventDialog({ open, onOpenChange, event }: EditEventDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventTypeId, setEventTypeId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [location, setLocation] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [visibility, setVisibility] = useState('public');
  const [isClosedNumber, setIsClosedNumber] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState<number | ''>('');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  // Populate form when event changes
  useEffect(() => {
    if (event && open) {
      setTitle(event.title);
      setDescription(event.description || '');
      setEventTypeId(event.event_type_id || '');
      const start = new Date(event.start_datetime);
      setStartDate(start.toISOString().slice(0, 10));
      setStartTime(start.toTimeString().slice(0, 5));
      if (event.end_datetime) {
        const end = new Date(event.end_datetime);
        setEndTime(end.toTimeString().slice(0, 5));
      } else {
        setEndTime('');
      }
      setLocation(event.location || '');
      setLocationSearch(event.location || '');
      setLocationLat(event.location_lat);
      setLocationLng(event.location_lng);
      setVisibility(event.visibility || 'public');
      setIsClosedNumber(event.is_closed_number || false);
      setMaxParticipants(event.max_participants || '');
      setCoverImageUrl(event.cover_image_url || null);
    }
  }, [event, open]);

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

  const handlePlaceSelect = (place: {
    name: string;
    formatted_address: string;
    geometry: { location: { lat: number; lng: number } };
  }) => {
    setLocation(place.formatted_address || place.name);
    setLocationSearch(place.name);
    setLocationLat(place.geometry.location.lat);
    setLocationLng(place.geometry.location.lng);
  };

  const updateEventMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const startDatetime = new Date(`${startDate}T${startTime}:00`).toISOString();
      const endDatetime = endTime ? new Date(`${startDate}T${endTime}:00`).toISOString() : null;

      const { error } = await supabase
        .from('calendar_events')
        .update({
          title,
          description: description || null,
          event_type_id: eventTypeId || null,
          start_datetime: startDatetime,
          end_datetime: endDatetime,
          location: location || null,
          location_lat: locationLat,
          location_lng: locationLng,
          visibility,
          is_closed_number: isClosedNumber,
          max_participants: isClosedNumber && maxParticipants ? Number(maxParticipants) : null,
          cover_image_url: coverImageUrl,
        })
        .eq('id', event.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Evento aggiornato! ✅');
      queryClient.invalidateQueries({ queryKey: ['pt-events'] });
      queryClient.invalidateQueries({ queryKey: ['public-events'] });
      queryClient.invalidateQueries({ queryKey: ['pt-calendar'] });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error updating event:', error);
      toast.error("Errore nell'aggiornamento dell'evento");
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('calendar_events')
        .update({ is_cancelled: true })
        .eq('id', event.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Evento eliminato');
      queryClient.invalidateQueries({ queryKey: ['pt-events'] });
      queryClient.invalidateQueries({ queryKey: ['public-events'] });
      queryClient.invalidateQueries({ queryKey: ['pt-calendar'] });
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Errore nell'eliminazione dell'evento");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Inserisci un titolo per l'evento");
      return;
    }
    updateEventMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Modifica Evento
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Cover Image */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Immagine copertina
            </Label>
            {coverImageUrl ? (
              <div className="relative group rounded-lg overflow-hidden border">
                <img
                  src={coverImageUrl}
                  alt="Cover"
                  className="w-full h-36 object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <ImageUpload
                    bucket="event-covers"
                    filePath={`${user?.id}/${Date.now()}.{ext}`}
                    onUploadComplete={(url) => setCoverImageUrl(url)}
                    variant="inline"
                    className="text-white"
                  >
                    <Button type="button" size="sm" variant="secondary">
                      <ImagePlus className="h-4 w-4 mr-1" />
                      Cambia
                    </Button>
                  </ImageUpload>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => setCoverImageUrl(null)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Rimuovi
                  </Button>
                </div>
              </div>
            ) : (
              <ImageUpload
                bucket="event-covers"
                filePath={`${user?.id}/${Date.now()}.{ext}`}
                onUploadComplete={(url) => setCoverImageUrl(url)}
                variant="gallery"
                className="h-28"
              />
            )}
          </div>

          <Separator />

          {/* Info base */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Informazioni evento
            </Label>
            <div className="space-y-2">
              <Label htmlFor="edit-title">Titolo *</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Es: Calisthenics Day Brescia"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrizione</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrivi il tuo evento..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo evento</Label>
              <Select value={eventTypeId} onValueChange={setEventTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona tipo" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Data e ora */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Data e orario
            </Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-date">Data</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-startTime">Inizio</Label>
                <Input
                  id="edit-startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-endTime">Fine</Label>
                <Input
                  id="edit-endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Luogo */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 inline mr-1" />
              Luogo
            </Label>
            <PlacesAutocomplete
              value={locationSearch}
              onChange={setLocationSearch}
              onPlaceSelect={handlePlaceSelect}
              placeholder="Cerca indirizzo o luogo..."
            />
            {location && (
              <p className="text-sm text-muted-foreground">📍 {location}</p>
            )}
          </div>

          <Separator />

          {/* Visibilità e numero chiuso */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Accesso e partecipanti
            </Label>
            <div className="space-y-2">
              <Label>
                <Eye className="h-4 w-4 inline mr-1" />
                Visibilità
              </Label>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Aperto a tutti
                    </div>
                  </SelectItem>
                  <SelectItem value="app_users">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Solo utenti app
                    </div>
                  </SelectItem>
                  <SelectItem value="connected_only">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Solo atleti collegati
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="edit-closed">Numero chiuso</Label>
                <p className="text-sm text-muted-foreground">
                  Limita il numero di partecipanti
                </p>
              </div>
              <Switch
                id="edit-closed"
                checked={isClosedNumber}
                onCheckedChange={setIsClosedNumber}
              />
            </div>
            {isClosedNumber && (
              <div className="space-y-2">
                <Label htmlFor="edit-maxParticipants">Max partecipanti</Label>
                <Input
                  id="edit-maxParticipants"
                  type="number"
                  min={1}
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value ? parseInt(e.target.value) : '')}
                  placeholder="Es: 20"
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Delete */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina evento
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminare questo evento?</AlertDialogTitle>
                <AlertDialogDescription>
                  L'evento verrà cancellato e non sarà più visibile. Questa azione non può essere annullata.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteEventMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Elimina
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={updateEventMutation.isPending}>
              {updateEventMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                'Salva Modifiche'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
