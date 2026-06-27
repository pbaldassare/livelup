import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
} from 'lucide-react';
import { PlacesAutocomplete } from '@/components/app/PlacesAutocomplete';
import { ImageUpload } from '@/components/common/ImageUpload';

interface CreatePublicEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
}

export function CreatePublicEventDialog({
  open,
  onOpenChange,
  selectedDate,
}: CreatePublicEventDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventTypeId, setEventTypeId] = useState<string>('');
  const [startDate, setStartDate] = useState(
    selectedDate?.toISOString().slice(0, 10) || new Date().toISOString().slice(0, 10)
  );
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [locationSearch, setLocationSearch] = useState('');
  const [location, setLocation] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [visibility, setVisibility] = useState('public');
  const [isClosedNumber, setIsClosedNumber] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState<number | ''>('');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

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

  const createEventMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const startDatetime = new Date(`${startDate}T${startTime}:00`).toISOString();
      const endDatetime = new Date(`${startDate}T${endTime}:00`).toISOString();

      const { error } = await supabase.from('calendar_events').insert([{
        creator_user_id: user.id,
        pt_user_id: user.id,
        title,
        description: description || null,
        event_type: 'evento' as const,
        category: 'evento',
        event_type_id: eventTypeId || null,
        start_datetime: startDatetime,
        end_datetime: endDatetime,
        location: location || null,
        location_lat: locationLat,
        location_lng: locationLng,
        is_public: true,
        visibility,
        is_closed_number: isClosedNumber,
        max_participants: isClosedNumber && maxParticipants ? Number(maxParticipants) : null,
        cover_image_url: coverImageUrl,
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Evento creato con successo! 🎉');
      queryClient.invalidateQueries({ queryKey: ['pt-events'] });
      queryClient.invalidateQueries({ queryKey: ['pt-events-manage'] });
      queryClient.invalidateQueries({ queryKey: ['public-events'] });
      queryClient.invalidateQueries({ queryKey: ['pt-calendar'] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Error creating event:', error);
      toast.error('Errore nella creazione dell\'evento');
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setEventTypeId('');
    setStartDate(new Date().toISOString().slice(0, 10));
    setStartTime('10:00');
    setEndTime('12:00');
    setLocationSearch('');
    setLocation('');
    setLocationLat(null);
    setLocationLng(null);
    setVisibility('public');
    setIsClosedNumber(false);
    setMaxParticipants('');
    setCoverImageUrl(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Inserisci un titolo per l\'evento');
      return;
    }
    createEventMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Crea Evento
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
              <Label htmlFor="title">Titolo *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Es: Calisthenics Day Brescia"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrizione</Label>
              <Textarea
                id="description"
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
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Inizio</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">Fine</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
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
                <Label htmlFor="closed">Numero chiuso</Label>
                <p className="text-sm text-muted-foreground">
                  Limita il numero di partecipanti
                </p>
              </div>
              <Switch
                id="closed"
                checked={isClosedNumber}
                onCheckedChange={setIsClosedNumber}
              />
            </div>
            {isClosedNumber && (
              <div className="space-y-2">
                <Label htmlFor="maxParticipants">Max partecipanti</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  min={1}
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value ? parseInt(e.target.value) : '')}
                  placeholder="Es: 20"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={createEventMutation.isPending}>
              {createEventMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creazione...
                </>
              ) : (
                'Crea Evento'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
