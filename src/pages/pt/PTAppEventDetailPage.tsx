import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  Loader2,
  MapPin,
  MessageCircle,
  Pencil,
  Trash2,
  Users,
} from 'lucide-react';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';
import { EventParticipantsPanel } from '@/components/pt/EventParticipantsPanel';
import { EventCommentsPanel } from '@/components/pt/EventCommentsPanel';
import { EditEventDialog } from '@/components/pt/EditEventDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { countEventParticipants } from '@/lib/api/eventParticipants';
import { countEventComments } from '@/lib/api/eventComments';
import { toast } from 'sonner';

export function PTAppEventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const [editOpen, setEditOpen] = useState(false);

  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'overview') next.delete('tab');
    else next.set('tab', value);
    setSearchParams(next, { replace: true });
  };

  const { data: event, isLoading } = useQuery({
    queryKey: ['pt-event-detail', eventId],
    queryFn: async () => {
      if (!eventId || !user?.id) return null;
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('id', eventId)
        .eq('pt_user_id', user.id)
        .eq('category', 'evento')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!eventId && !!user?.id,
  });

  const { data: counts } = useQuery({
    queryKey: ['event-participant-counts', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const map = await countEventParticipants([eventId]);
      return map[eventId] ?? { registered: 0, waitlist: 0 };
    },
    enabled: !!eventId,
  });

  const { data: commentCount = 0 } = useQuery({
    queryKey: ['event-comment-counts', eventId],
    queryFn: async () => {
      if (!eventId) return 0;
      const map = await countEventComments([eventId]);
      return map[eventId] ?? 0;
    },
    enabled: !!eventId,
  });

  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      if (!eventId) throw new Error('Missing event');
      const { error } = await supabase
        .from('calendar_events')
        .update({ is_cancelled: true })
        .eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-events-manage'] });
      queryClient.invalidateQueries({ queryKey: ['pt-event-detail', eventId] });
      queryClient.invalidateQueries({ queryKey: ['pt-events'] });
      toast.success('Evento eliminato');
      navigate('/pt/app/events');
    },
    onError: () => toast.error("Errore durante l'eliminazione"),
  });

  if (isLoading) {
    return (
      <PTAppPageShell title="Evento" showBack backTo="/pt/app/events">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-app-muted-foreground" />
        </div>
      </PTAppPageShell>
    );
  }

  if (!event) {
    return (
      <PTAppPageShell title="Evento" showBack backTo="/pt/app/events">
        <div className="text-center py-16 space-y-4 px-4">
          <Calendar className="h-12 w-12 mx-auto text-app-muted-foreground" />
          <p className="text-app-muted-foreground">Evento non trovato</p>
          <Button
            variant="outline"
            className="border-app-border text-app-foreground"
            onClick={() => navigate('/pt/app/events')}
          >
            Torna agli eventi
          </Button>
        </div>
      </PTAppPageShell>
    );
  }

  const start = new Date(event.start_datetime);
  const end = event.end_datetime ? new Date(event.end_datetime) : null;
  const creatorUserId = event.creator_user_id ?? user!.id;

  return (
    <PTAppPageShell
      title={event.title}
      description="Gestisci evento pubblico"
      showBack
      backTo="/pt/app/events"
      actions={
        !event.is_cancelled ? (
          <Button
            size="sm"
            variant="ghost"
            className="text-app-foreground"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4 px-1 pb-4">
        <div className="flex flex-wrap gap-2">
          <Badge
            variant="secondary"
            className="gap-1 bg-app-muted text-app-foreground border-0"
          >
            <Users className="h-3 w-3" />
            {counts?.registered ?? 0} iscritti
          </Badge>
          {(counts?.waitlist ?? 0) > 0 && (
            <Badge variant="outline" className="border-app-border text-app-foreground">
              {counts!.waitlist} in attesa
            </Badge>
          )}
          <Badge
            variant="outline"
            className="gap-1 border-app-border text-app-muted-foreground"
          >
            <MessageCircle className="h-3 w-3" />
            {commentCount}
          </Badge>
          {event.is_cancelled && <Badge variant="destructive">Cancellato</Badge>}
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-full grid grid-cols-3 bg-app-card border border-app-border">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              Panoramica
            </TabsTrigger>
            <TabsTrigger value="participants" className="text-xs sm:text-sm">
              Iscritti
            </TabsTrigger>
            <TabsTrigger value="comments" className="text-xs sm:text-sm">
              Commenti
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {event.cover_image_url && (
              <img
                src={event.cover_image_url}
                alt=""
                className="w-full max-h-48 object-cover rounded-xl border border-app-border"
              />
            )}

            <Card className="bg-app-card border-app-border">
              <CardContent className="p-4 space-y-3 text-sm">
                <div className="flex items-center gap-2 text-app-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0 text-app-accent" />
                  <span className="capitalize text-app-foreground">
                    {format(start, 'EEEE d MMMM yyyy', { locale: it })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-app-muted-foreground">
                  <Clock className="h-4 w-4 shrink-0 text-app-accent" />
                  <span className="text-app-foreground">
                    {format(start, 'HH:mm')}
                    {end && ` – ${format(end, 'HH:mm')}`}
                  </span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-2 text-app-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0 text-app-accent" />
                    <span className="text-app-foreground">{event.location}</span>
                  </div>
                )}
                {event.description && (
                  <p className="text-app-foreground pt-2 border-t border-app-border">
                    {event.description}
                  </p>
                )}
                {event.is_closed_number && event.max_participants != null && (
                  <p className="text-app-muted-foreground">
                    Numero chiuso: max {event.max_participants} partecipanti
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Modifica
              </Button>
              {!event.is_cancelled && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Elimina
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Eliminare questo evento?</AlertDialogTitle>
                      <AlertDialogDescription>
                        L&apos;evento verrà cancellato e non sarà più visibile. Questa
                        azione non può essere annullata.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground"
                        onClick={() => deleteEventMutation.mutate()}
                      >
                        Elimina
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </TabsContent>

          <TabsContent value="participants" className="mt-4">
            <Card className="bg-app-card border-app-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-app-accent" />
                  <h3 className="font-semibold text-app-foreground text-sm">
                    Gestione iscritti
                  </h3>
                </div>
                <EventParticipantsPanel
                  eventId={event.id}
                  eventTitle={event.title}
                  isClosedNumber={event.is_closed_number}
                  maxParticipants={event.max_participants}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comments" className="mt-4">
            <Card className="bg-app-card border-app-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="h-4 w-4 text-app-accent" />
                  <h3 className="font-semibold text-app-foreground text-sm">Commenti</h3>
                </div>
                <EventCommentsPanel eventId={event.id} creatorUserId={creatorUserId} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {editOpen && (
        <EditEventDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          event={event as Parameters<typeof EditEventDialog>[0]['event']}
          initialTab="details"
        />
      )}
    </PTAppPageShell>
  );
}

export default PTAppEventDetailPage;
