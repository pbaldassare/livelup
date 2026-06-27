import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CornerDownRight, Loader2, MessageCircle, Reply, Send, Trash2, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  commentAuthorName,
  deleteEventComment,
  loadEventComments,
  postEventComment,
  type EventCommentRow,
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
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['event-comments-pt', eventId],
    queryFn: () => loadEventComments(eventId),
    enabled: !!eventId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['event-comments-pt', eventId] });
    queryClient.invalidateQueries({ queryKey: ['event-comment-counts'] });
  };

  const postMutation = useMutation({
    mutationFn: () => postEventComment(eventId, user!.id, draft, null),
    onSuccess: () => {
      setDraft('');
      invalidate();
      toast.success('Commento pubblicato');
    },
    onError: () => toast.error('Errore invio commento'),
  });

  const replyMutation = useMutation({
    mutationFn: (parentId: string) =>
      postEventComment(eventId, user!.id, replyDraft, parentId),
    onSuccess: () => {
      setReplyDraft('');
      setReplyTo(null);
      invalidate();
      toast.success('Risposta pubblicata');
    },
    onError: () => toast.error('Errore invio risposta'),
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
  const isOrganizer = user?.id === creatorUserId;

  const renderRow = (c: EventCommentRow, opts: { isReply?: boolean } = {}) => {
    const isAuthorOrganizer = c.user_id === creatorUserId;
    return (
      <div className="flex items-start gap-3">
        {opts.isReply && (
          <CornerDownRight className="h-4 w-4 mt-2 text-muted-foreground shrink-0" />
        )}
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={c.profile?.avatar_url ?? undefined} />
          <AvatarFallback>{commentAuthorName(c).slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{commentAuthorName(c)}</span>
            {isAuthorOrganizer && (
              <Badge variant="secondary" className="text-xs">Organizzatore</Badge>
            )}
            {opts.isReply && (
              <Badge variant="outline" className="text-xs">Risposta</Badge>
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
    );
  };

  return (
    <div className="space-y-4">
      {user && (
        <div className="flex gap-2">
          <Textarea
            rows={2}
            className="resize-none flex-1"
            placeholder={isOrganizer ? 'Scrivi una risposta come organizzatore…' : 'Scrivi un commento…'}
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
      ) : threads.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6 flex items-center justify-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Nessun commento ancora
        </p>
      ) : (
        <ul className="space-y-3">
          {threads.map((t) => (
            <li key={t.id} className="rounded-md border p-3 text-sm space-y-3">
              {renderRow(t)}

              {/* Reply action: organizer only, on comments not authored by themselves */}
              {isOrganizer && t.user_id !== user?.id && (
                <div className="pl-12">
                  {replyTo === t.id ? (
                    <div className="space-y-2">
                      <Textarea
                        rows={2}
                        className="resize-none"
                        placeholder="Scrivi una risposta come organizzatore…"
                        value={replyDraft}
                        onChange={(e) => setReplyDraft(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setReplyTo(null);
                            setReplyDraft('');
                          }}
                        >
                          <X className="h-4 w-4 mr-1" /> Annulla
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={!replyDraft.trim() || replyMutation.isPending}
                          onClick={() => replyMutation.mutate(t.id)}
                        >
                          {replyMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-1" />
                          )}
                          Invia
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setReplyTo(t.id);
                        setReplyDraft('');
                      }}
                    >
                      <Reply className="h-3.5 w-3.5 mr-1" /> Rispondi
                    </Button>
                  )}
                </div>
              )}

              {/* Replies */}
              {t.replies.length > 0 && (
                <ul className="pl-6 border-l-2 border-primary/30 space-y-3 ml-3">
                  {t.replies.map((r) => (
                    <li key={r.id} className="pl-2">
                      {renderRow(r, { isReply: true })}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
