import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { promoteWaitlistIfSlot, registerForEvent } from '@/lib/api/eventParticipants';
import { toast } from 'sonner';
import { 
  Users, 
  PartyPopper, 
  Trophy, 
  Calendar,
  MapPin,
  Clock,
  User,
  Loader2,
  Check,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Google Maps Static API key (public)
const GOOGLE_MAPS_API_KEY = 'AIzaSyA76iVcQpSnl76_G6bJVnEeOUmWVd7278I';

interface PublicEventProps {
  event: {
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
    is_closed_number?: boolean;
    max_participants?: number | null;
  };
  onRegistrationChange?: () => void;
}

const EVENT_TYPE_CONFIG = {
  raduno: { icon: Users, color: 'bg-app-accent text-app-accent-foreground', label: 'Raduno' },
  evento: { icon: PartyPopper, color: 'bg-violet-500 text-white', label: 'Evento' },
  gara: { icon: Trophy, color: 'bg-orange-500 text-white', label: 'Gara' },
  allenamento: { icon: Calendar, color: 'bg-blue-500 text-white', label: 'Allenamento' },
  altro: { icon: Calendar, color: 'bg-gray-500 text-white', label: 'Altro' },
};

export function PublicEventCard({ event, onRegistrationChange }: PublicEventProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<'none' | 'registered' | 'waitlist'>(
    event.is_registered ? 'registered' : 'none',
  );
  const [participantCount, setParticipantCount] = useState(event.participant_count);

  const isRegistered = registrationStatus === 'registered';
  const isWaitlist = registrationStatus === 'waitlist';

  const isFull = event.is_closed_number && event.max_participants != null && participantCount >= event.max_participants;

  const typeConfig = EVENT_TYPE_CONFIG[event.event_type as keyof typeof EVENT_TYPE_CONFIG] || EVENT_TYPE_CONFIG.altro;
  const TypeIcon = typeConfig.icon;

  const startDate = new Date(event.start_datetime);
  const endDate = event.end_datetime ? new Date(event.end_datetime) : null;

  const formattedDate = format(startDate, "EEEE d MMMM", { locale: it });
  const formattedTime = endDate 
    ? `${format(startDate, "HH:mm")} - ${format(endDate, "HH:mm")}`
    : format(startDate, "HH:mm");

  const getStaticMapUrl = () => {
    if (!event.location_lat || !event.location_lng) return null;
    return `https://maps.googleapis.com/maps/api/staticmap?center=${event.location_lat},${event.location_lng}&zoom=14&size=600x200&scale=2&maptype=roadmap&style=feature:all|element:labels.text.fill|color:0xffffff&style=feature:all|element:labels.text.stroke|color:0x000000|weight:3&style=feature:administrative|element:geometry|color:0x1a1a1a&style=feature:landscape|element:geometry|color:0x1a1a1a&style=feature:poi|element:geometry|color:0x242424&style=feature:road|element:geometry|color:0x2a2a2a&style=feature:transit|element:geometry|color:0x1a1a1a&style=feature:water|element:geometry|color:0x0a0a0a&markers=color:0xD4FF00%7C${event.location_lat},${event.location_lng}&key=${GOOGLE_MAPS_API_KEY}`;
  };

  const handleRegistration = async () => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    setIsLoading(true);
    try {
      if (isRegistered || isWaitlist) {
        const { error } = await supabase
          .from('event_participants')
          .delete()
          .eq('event_id', event.id)
          .eq('user_id', user.id);

        if (error) throw error;

        await promoteWaitlistIfSlot(event.id);
        setRegistrationStatus('none');
        if (isRegistered) setParticipantCount(prev => Math.max(0, prev - 1));
        toast.success('Iscrizione annullata');
      } else {
        const status = await registerForEvent(event.id, user.id, {
          is_closed_number: event.is_closed_number ?? false,
          max_participants: event.max_participants ?? null,
        });
        setRegistrationStatus(status);
        if (status === 'registered') setParticipantCount(prev => prev + 1);
        toast.success(status === 'waitlist' ? 'Sei in lista d\'attesa' : 'Iscrizione confermata! 🎉');
      }

      onRegistrationChange?.();
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Errore durante l\'operazione');
    } finally {
      setIsLoading(false);
    }
  };

  const organizerInitials = event.organizer 
    ? `${event.organizer.first_name?.[0] || ''}${event.organizer.last_name?.[0] || ''}`
    : 'PT';
  const organizerName = event.organizer 
    ? `${event.organizer.first_name || ''} ${event.organizer.last_name || ''}`.trim()
    : 'Organizzatore';

  const goToDetail = () => {
    navigate(`/app/events/${event.id}`);
  };

  return (
    <Card 
      className="overflow-hidden bg-app-card border-app-border cursor-pointer hover:border-app-accent/50 transition-colors"
      onClick={goToDetail}
    >
      {/* Event Type Badge */}
      <div className={cn("px-4 py-2 flex items-center justify-between", typeConfig.color)}>
        <div className="flex items-center gap-2">
          <TypeIcon className="h-4 w-4" />
          <span className="text-sm font-medium">{event.event_type_name || typeConfig.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {event.is_closed_number && event.max_participants && (
            <span className="text-xs opacity-80">{participantCount}/{event.max_participants}</span>
          )}
          <ChevronRight className="h-4 w-4 opacity-70" />
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Title & Description */}
        <div>
          <h3 className="text-lg font-bold text-app-foreground">{event.title}</h3>
          {event.description && (
            <p className="text-sm text-app-muted-foreground mt-1 line-clamp-2">
              {event.description}
            </p>
          )}
        </div>

        {/* Date & Time */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-app-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="capitalize">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2 text-app-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formattedTime}</span>
          </div>
        </div>

        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-2 text-sm text-app-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{event.location}</span>
          </div>
        )}

        {/* Static Map */}
        {getStaticMapUrl() && (
          <div className="rounded-lg overflow-hidden">
            <img 
              src={getStaticMapUrl()!} 
              alt={`Mappa - ${event.location}`}
              className="w-full h-32 object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Organizer */}
        <div className="flex items-center gap-3 pt-2 border-t border-app-border">
          <Avatar className="h-8 w-8">
            <AvatarImage src={event.organizer?.avatar_url || undefined} />
            <AvatarFallback className="bg-app-muted text-app-foreground text-xs">
              {organizerInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-app-muted-foreground">Organizzato da</p>
            <p className="text-sm font-medium text-app-foreground truncate">{organizerName}</p>
          </div>
          
          {/* Participants Count */}
          <Badge variant="secondary" className="bg-app-muted text-app-foreground">
            <Users className="h-3 w-3 mr-1" />
            {participantCount}
          </Badge>
        </div>

        {/* Action Button */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleRegistration();
          }}
          disabled={isLoading}
          className={cn(
            "w-full",
            isRegistered
              ? "bg-app-muted text-app-foreground hover:bg-app-muted/80"
              : isWaitlist
                ? "bg-amber-500/20 text-app-foreground hover:bg-amber-500/30"
                : "bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isRegistered ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Iscritto
            </>
          ) : isWaitlist ? (
            'In lista d\'attesa — Annulla'
          ) : isFull ? (
            'Lista d\'attesa'
          ) : (
            'Partecipa'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
