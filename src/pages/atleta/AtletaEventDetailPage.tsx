import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Send,
  Share2,
  Check,
  Loader2,
  PartyPopper,
  Trophy,
  Dumbbell,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';

// Google Maps Static API key (public)
const GOOGLE_MAPS_API_KEY = 'AIzaSyA76iVcQpSnl76_G6bJVnEeOUmWVd7278I';

const EVENT_TYPE_CONFIG = {
  raduno: { icon: Users, color: 'bg-app-accent text-app-accent-foreground', label: 'Raduno' },
  evento: { icon: PartyPopper, color: 'bg-violet-500 text-white', label: 'Evento' },
  gara: { icon: Trophy, color: 'bg-orange-500 text-white', label: 'Gara' },
  allenamento: { icon: Dumbbell, color: 'bg-blue-500 text-white', label: 'Allenamento' },
  altro: { icon: Calendar, color: 'bg-gray-500 text-white', label: 'Altro' },
};

interface EventComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user?: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
}

interface Participant {
  id: string;
  user_id: string;
  registered_at: string;
  user?: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
}

export function AtletaEventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Fetch event details
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event-detail', eventId],
    queryFn: async () => {
      if (!eventId) return null;

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('id', eventId)
        .eq('is_public', true)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Get organizer profile
      const { data: organizer } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('user_id', data.creator_user_id)
        .maybeSingle();

      return { ...data, organizer };
    },
    enabled: !!eventId,
  });

  // Fetch participants
  const { data: participants } = useQuery({
    queryKey: ['event-participants', eventId],
    queryFn: async () => {
      if (!eventId) return [];

      const { data, error } = await supabase
        .from('event_participants')
        .select('id, user_id, registered_at')
        .eq('event_id', eventId)
        .eq('status', 'registered')
        .order('registered_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles for participants
      const withProfiles = await Promise.all(
        (data || []).map(async (p) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('user_id', p.user_id)
            .maybeSingle();
          return { ...p, user: profile };
        })
      );

      return withProfiles as Participant[];
    },
    enabled: !!eventId,
  });

  // Check if current user is registered
  const { data: isRegistered } = useQuery({
    queryKey: ['event-registration', eventId, user?.id],
    queryFn: async () => {
      if (!eventId || !user) return false;

      const { data } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .eq('status', 'registered')
        .maybeSingle();

      return !!data;
    },
    enabled: !!eventId && !!user,
  });

  // Fetch comments with real-time subscription
  const { data: comments } = useQuery({
    queryKey: ['event-comments', eventId],
    queryFn: async () => {
      if (!eventId) return [];

      const { data, error } = await supabase
        .from('event_comments')
        .select('id, content, created_at, user_id')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles for comments
      const withProfiles = await Promise.all(
        (data || []).map(async (c) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('user_id', c.user_id)
            .maybeSingle();
          return { ...c, user: profile };
        })
      );

      return withProfiles as EventComment[];
    },
    enabled: !!eventId,
  });

  // Registration mutation
  const handleRegistration = async () => {
    if (!user || !eventId) {
      toast.error('Devi essere autenticato');
      return;
    }

    setIsRegistering(true);
    try {
      if (isRegistered) {
        await supabase
          .from('event_participants')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user.id);
        toast.success('Iscrizione annullata');
      } else {
        await supabase.from('event_participants').insert({
          event_id: eventId,
          user_id: user.id,
          status: 'registered',
        });
        toast.success('Iscrizione confermata! 🎉');
      }
      queryClient.invalidateQueries({ queryKey: ['event-registration', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-participants', eventId] });
    } catch (error) {
      toast.error('Errore durante l\'operazione');
    } finally {
      setIsRegistering(false);
    }
  };

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user || !eventId) throw new Error('Not authenticated');

      const { error } = await supabase.from('event_comments').insert({
        event_id: eventId,
        user_id: user.id,
        content,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['event-comments', eventId] });
      toast.success('Commento aggiunto');
    },
    onError: () => {
      toast.error('Errore nell\'aggiungere il commento');
    },
  });

  const handleShare = async () => {
    if (!event) return;

    const shareData = {
      title: event.title,
      text: event.description || `Partecipa a ${event.title}!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copiato!');
    }
  };

  const openInMaps = () => {
    if (!event?.location_lat || !event?.location_lng) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${event.location_lat},${event.location_lng}`;
    window.open(url, '_blank');
  };

  if (eventLoading) {
    return (
      <div className="min-h-screen bg-app-background p-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-app-background p-4">
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 mx-auto text-app-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold text-app-foreground">Evento non trovato</h2>
          <Link to="/app/discover">
            <Button variant="outline" className="mt-4">
              Torna agli eventi
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const typeConfig = EVENT_TYPE_CONFIG[event.event_type as keyof typeof EVENT_TYPE_CONFIG] || EVENT_TYPE_CONFIG.altro;
  const TypeIcon = typeConfig.icon;
  const startDate = new Date(event.start_datetime);
  const endDate = event.end_datetime ? new Date(event.end_datetime) : null;

  const getStaticMapUrl = () => {
    if (!event.location_lat || !event.location_lng) return null;
    return `https://maps.googleapis.com/maps/api/staticmap?center=${event.location_lat},${event.location_lng}&zoom=14&size=600x300&scale=2&maptype=roadmap&style=feature:all|element:labels.text.fill|color:0xffffff&style=feature:all|element:labels.text.stroke|color:0x000000|weight:3&style=feature:administrative|element:geometry|color:0x1a1a1a&style=feature:landscape|element:geometry|color:0x1a1a1a&style=feature:poi|element:geometry|color:0x242424&style=feature:road|element:geometry|color:0x2a2a2a&style=feature:transit|element:geometry|color:0x1a1a1a&style=feature:water|element:geometry|color:0x0a0a0a&markers=color:0xD4FF00%7C${event.location_lat},${event.location_lng}&key=${GOOGLE_MAPS_API_KEY}`;
  };

  const organizerName = event.organizer
    ? `${event.organizer.first_name || ''} ${event.organizer.last_name || ''}`.trim()
    : 'Organizzatore';

  return (
    <div className="min-h-screen bg-app-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-app-background/95 backdrop-blur border-b border-app-border p-4">
        <div className="flex items-center gap-3">
          <Link to="/app/discover">
            <Button variant="ghost" size="icon" className="text-app-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-app-foreground flex-1 truncate">
            {event.title}
          </h1>
          <Button variant="ghost" size="icon" onClick={handleShare} className="text-app-foreground">
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Event Type Badge */}
        <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full', typeConfig.color)}>
          <TypeIcon className="h-4 w-4" />
          <span className="text-sm font-medium">{typeConfig.label}</span>
        </div>

        {/* Title & Description */}
        <div>
          <h2 className="text-2xl font-bold text-app-foreground">{event.title}</h2>
          {event.description && (
            <p className="text-app-muted-foreground mt-2">{event.description}</p>
          )}
        </div>

        {/* Date & Time */}
        <Card className="bg-app-card border-app-border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3 text-app-foreground">
              <Calendar className="h-5 w-5 text-app-accent" />
              <span className="capitalize">{format(startDate, "EEEE d MMMM yyyy", { locale: it })}</span>
            </div>
            <div className="flex items-center gap-3 text-app-foreground">
              <Clock className="h-5 w-5 text-app-accent" />
              <span>
                {format(startDate, "HH:mm")}
                {endDate && ` - ${format(endDate, "HH:mm")}`}
              </span>
            </div>
            {event.location && (
              <div className="flex items-center gap-3 text-app-foreground">
                <MapPin className="h-5 w-5 text-app-accent" />
                <span className="flex-1">{event.location}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Map */}
        {getStaticMapUrl() && (
          <div 
            className="rounded-xl overflow-hidden cursor-pointer relative group"
            onClick={openInMaps}
          >
            <img
              src={getStaticMapUrl()!}
              alt={`Mappa - ${event.location}`}
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-2 text-white">
                <ExternalLink className="h-5 w-5" />
                <span>Apri in Maps</span>
              </div>
            </div>
          </div>
        )}

        {/* Organizer */}
        <Card className="bg-app-card border-app-border">
          <CardContent className="p-4">
            <p className="text-xs text-app-muted-foreground mb-2">Organizzato da</p>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={event.organizer?.avatar_url || undefined} />
                <AvatarFallback className="bg-app-muted text-app-foreground">
                  {organizerName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-app-foreground">{organizerName}</p>
                <p className="text-sm text-app-muted-foreground">Personal Trainer</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registration Button */}
        <Button
          onClick={handleRegistration}
          disabled={isRegistering}
          className={cn(
            'w-full h-12 text-lg font-semibold',
            isRegistered
              ? 'bg-app-muted text-app-foreground hover:bg-app-muted/80'
              : 'bg-app-accent text-app-accent-foreground hover:bg-app-accent/90'
          )}
        >
          {isRegistering ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isRegistered ? (
            <>
              <Check className="h-5 w-5 mr-2" />
              Iscritto
            </>
          ) : (
            'Partecipa'
          )}
        </Button>

        {/* Participants */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-app-accent" />
            <h3 className="font-bold text-app-foreground">
              Partecipanti ({participants?.length || 0})
            </h3>
          </div>

          {participants && participants.length > 0 ? (
            <div className="grid grid-cols-4 gap-3">
              {participants.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center"
                >
                  <Avatar className="h-14 w-14 border-2 border-app-border">
                    <AvatarImage src={p.user?.avatar_url || undefined} />
                    <AvatarFallback className="bg-app-muted text-app-foreground text-xs">
                      {(p.user?.first_name?.[0] || '') + (p.user?.last_name?.[0] || '')}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-xs text-app-muted-foreground mt-1 text-center truncate w-full">
                    {p.user?.first_name || 'Utente'}
                  </p>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-app-muted-foreground text-sm">Nessun partecipante ancora</p>
          )}
        </div>

        {/* Comments Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="h-5 w-5 text-app-accent" />
            <h3 className="font-bold text-app-foreground">
              Commenti ({comments?.length || 0})
            </h3>
          </div>

          {/* Comment Input */}
          {user && (
            <div className="flex gap-2 mb-4">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Scrivi un commento..."
                className="bg-app-card border-app-border text-app-foreground placeholder:text-app-muted-foreground resize-none"
                rows={2}
              />
              <Button
                onClick={() => newComment.trim() && addCommentMutation.mutate(newComment.trim())}
                disabled={!newComment.trim() || addCommentMutation.isPending}
                size="icon"
                className="bg-app-accent text-app-accent-foreground h-auto"
              >
                {addCommentMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {comments?.map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Card className="bg-app-card border-app-border">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.user?.avatar_url || undefined} />
                          <AvatarFallback className="bg-app-muted text-app-foreground text-xs">
                            {(comment.user?.first_name?.[0] || '') + (comment.user?.last_name?.[0] || '')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-app-foreground text-sm">
                              {comment.user?.first_name || 'Utente'} {comment.user?.last_name || ''}
                            </span>
                            <span className="text-xs text-app-muted-foreground">
                              {format(new Date(comment.created_at), 'd MMM HH:mm', { locale: it })}
                            </span>
                          </div>
                          <p className="text-app-foreground text-sm mt-1">{comment.content}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            {(!comments || comments.length === 0) && (
              <p className="text-app-muted-foreground text-sm text-center py-4">
                Nessun commento ancora. Sii il primo!
              </p>
            )}
          </div>
        </div>

        {/* Social Sharing */}
        <Card className="bg-app-card border-app-border">
          <CardContent className="p-4">
            <h4 className="font-semibold text-app-foreground mb-3">Condividi evento</h4>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-app-border text-app-foreground"
                onClick={() => {
                  const url = encodeURIComponent(window.location.href);
                  const text = encodeURIComponent(`Partecipa a ${event.title}!`);
                  window.open(`https://wa.me/?text=${text}%20${url}`, '_blank');
                }}
              >
                WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-app-border text-app-foreground"
                onClick={() => {
                  const url = encodeURIComponent(window.location.href);
                  const text = encodeURIComponent(event.title);
                  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
                }}
              >
                Twitter
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-app-border text-app-foreground"
                onClick={() => {
                  const url = encodeURIComponent(window.location.href);
                  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
                }}
              >
                Facebook
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AtletaEventDetailPage;
