import { useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Loader2,
  MapPin,
  MessageCircle,
  Pencil,
  Trash2,
  Users,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { EventParticipantsPanel } from '@/components/pt/EventParticipantsPanel';
import { EventCommentsPanel } from '@/components/pt/EventCommentsPanel';
import { EditEventDialog } from '@/components/pt/EditEventDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { countEventParticipants } from '@/lib/api/eventParticipants';
import { countEventComments } from '@/lib/api/eventComments';
import { toast } from 'sonner';

export default function PTEventDetailPage() {
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
      toast.success('Evento eliminato');
      navigate('/pt/events');
    },
    onError: () => toast.error('Errore durante l\'eliminazione'),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-muted-foreground">Evento non trovato</p>
        <Button variant="outline" onClick={() => navigate('/pt/events')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna alla gestione eventi
        </Button>
      </div>
    );
  }

  const start = new Date(event.start_datetime);
  const end = event.end_datetime ? new Date(event.end_datetime) : null;
  const creatorUserId = event.creator_user_id ?? user!.id;

  return (
    <div className="space-y-6 max-w-3xl pb-10">
      <div>
        <Button variant="ghost" size="sm" className="mb-2 -ml-2" asChild>
          <Link to="/pt/events">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Eventi
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{event.title}</h1>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            {counts?.registered ?? 0} iscritti
          </Badge>
          {(counts?.waitlist ?? 0) > 0 && (
            <Badge variant="outline">{counts!.waitlist} in attesa</Badge>
          )}
          <Badge variant="outline" className="gap-1">
            <MessageCircle className="h-3 w-3" />
            {commentCount} commenti
          </Badge>
          {event.is_cancelled && <Badge variant="destructive">Cancellato</Badge>}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="participants">Iscritti</TabsTrigger>
          <TabsTrigger value="comments">Commenti</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          {event.cover_image_url && (
            <img
              src={event.cover_image_url}
              alt=""
              className="w-full max-h-56 object-cover rounded-xl border"
            />
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Informazioni</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0" />
                <span className="capitalize text-foreground">
                  {format(start, 'EEEE d MMMM yyyy', { locale: it })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                <span className="text-foreground">
                  {format(start, 'HH:mm')}
                  {end && ` – ${format(end, 'HH:mm')}`}
                </span>
              </div>
              {event.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="text-foreground">{event.location}</span>
                </div>
              )}
              {event.description && (
                <p className="text-foreground pt-2 border-t">{event.description}</p>
              )}
              {event.is_closed_number && event.max_participants != null && (
                <p className="text-muted-foreground">
                  Numero chiuso: max {event.max_participants} partecipanti
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setEditOpen(true)}>
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
                      L&apos;evento verrà cancellato e non sarà più visibile. Questa azione non può essere annullata.
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Gestione iscritti
              </CardTitle>
            </CardHeader>
            <CardContent>
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Commenti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EventCommentsPanel eventId={event.id} creatorUserId={creatorUserId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {editOpen && (
        <EditEventDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          event={event as Parameters<typeof EditEventDialog>[0]['event']}
          initialTab="details"
        />
      )}
    </div>
  );
}
