import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Loader2, MessageCircle, Send, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  commentAuthorName,
  deleteEventComment,
  loadEventComments,
  postEventComment,
} from '@/lib/api/eventComments';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { toast } from 'sonner';

type Props = {
  eventId: string;
  creatorUserId: string;
};

export function EventCommentsPanel({ eventId, creatorUserId }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['event-comments-pt', eventId],
    queryFn: () => loadEventComments(eventId),
    enabled: !!eventId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['event-comments-pt', eventId] });
    queryClient.invalidateQueries({ queryKey: ['event-comment-counts'] });
  };

  const postMutation = useMutation({
    mutationFn: () => postEventComment(eventId, user!.id, draft),
    onSuccess: () => {
      setDraft('');
      invalidate();
      toast.success('Commento pubblicato');
    },
    onError: () => toast.error('Errore invio commento'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEventComment,
    onSuccess: () => {
      invalidate();
      toast.success('Commento eliminato');
    },
    onError: () => toast.error('Impossibile eliminare il commento'),
  });

  const canModerate = (authorId: string) =>
    user?.id === authorId || user?.id === creatorUserId;

  return (
    <div className="space-y-4">
      {user && (
        <div className="flex gap-2">
          <Textarea
            rows={2}
            className="resize-none flex-1"
            placeholder="Scrivi una risposta come organizzatore…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button
            type="button"
            size="icon"
            className="h-auto shrink-0"
            disabled={!draft.trim() || postMutation.isPending}
            onClick={() => postMutation.mutate()}
          >
            {postMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6 flex items-center justify-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Nessun commento ancora
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => {
            const isOrganizer = c.user_id === creatorUserId;
            return (
              <li key={c.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-start gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={c.profile?.avatar_url ?? undefined} />
                    <AvatarFallback>{commentAuthorName(c).slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{commentAuthorName(c)}</span>
                      {isOrganizer && (
                        <Badge variant="secondary" className="text-xs">Organizzatore</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(c.created_at), "d MMM yyyy, HH:mm", { locale: it })}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap">{c.content}</p>
                  </div>
                  {canModerate(c.user_id) && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminare questo commento?</AlertDialogTitle>
                          <AlertDialogDescription>
                            L&apos;azione non può essere annullata.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground"
                            onClick={() => deleteMutation.mutate(c.id)}
                          >
                            Elimina
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
