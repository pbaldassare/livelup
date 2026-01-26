import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Calendar,
  MapPin,
  Users,
  PartyPopper,
  Trophy,
  Dumbbell,
  Loader2,
} from 'lucide-react';
import { PlacesAutocomplete } from '@/components/app/PlacesAutocomplete';

interface CreatePublicEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
}

const EVENT_TYPES = [
  { value: 'raduno', label: 'Raduno', icon: Users },
  { value: 'evento', label: 'Evento', icon: PartyPopper },
  { value: 'gara', label: 'Gara', icon: Trophy },
  { value: 'allenamento', label: 'Allenamento', icon: Dumbbell },
  { value: 'altro', label: 'Altro', icon: Calendar },
];

export function CreatePublicEventDialog({
  open,
  onOpenChange,
  selectedDate,
}: CreatePublicEventDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<string>('raduno');
  const [startDate, setStartDate] = useState(
    selectedDate?.toISOString().slice(0, 10) || new Date().toISOString().slice(0, 10)
  );
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [locationSearch, setLocationSearch] = useState('');
  const [location, setLocation] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [isPublic, setIsPublic] = useState(true);

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
        event_type: eventType as 'allenamento' | 'evento' | 'gara' | 'raduno' | 'altro',
        start_datetime: startDatetime,
        end_datetime: endDatetime,
        location: location || null,
        location_lat: locationLat,
        location_lng: locationLng,
        is_public: isPublic,
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Evento creato con successo! 🎉');
      queryClient.invalidateQueries({ queryKey: ['pt-events'] });
      queryClient.invalidateQueries({ queryKey: ['public-events'] });
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
    setEventType('raduno');
    setStartDate(new Date().toISOString().slice(0, 10));
    setStartTime('10:00');
    setEndTime('12:00');
    setLocationSearch('');
    setLocation('');
    setLocationLat(null);
    setLocationLng(null);
    setIsPublic(true);
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Crea Evento Pubblico
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titolo evento *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es: CrossFit Day Brescia"
              required
            />
          </div>

          {/* Description */}
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

          {/* Event Type */}
          <div className="space-y-2">
            <Label>Tipo evento</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona tipo" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date & Time */}
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

          {/* Location with Google Places */}
          <div className="space-y-2">
            <Label>
              <MapPin className="h-4 w-4 inline mr-1" />
              Location
            </Label>
            <PlacesAutocomplete
              value={locationSearch}
              onChange={setLocationSearch}
              onPlaceSelect={handlePlaceSelect}
              placeholder="Cerca indirizzo o luogo..."
            />
            {location && (
              <p className="text-sm text-muted-foreground mt-1">
                📍 {location}
              </p>
            )}
          </div>

          {/* Public Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="public">Evento pubblico</Label>
              <p className="text-sm text-muted-foreground">
                Visibile a tutti gli atleti nella sezione Scopri
              </p>
            </div>
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
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
