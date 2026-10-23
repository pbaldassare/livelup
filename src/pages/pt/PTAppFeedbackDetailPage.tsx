import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';
import { useAuth } from '@/hooks/useAuth';
import {
  getPtFeedbackTicket,
  listTicketMessages,
  sendPtFeedbackReply,
} from '@/lib/api/feedbackTickets';
import { FeedbackAttachmentList } from '@/components/feedback/FeedbackAttachmentList';
import { ticketStatusLabel } from '@/lib/feedbackTickets';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useRef, useState } from 'react';
import { Loader2, Paperclip, Send } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { validateFeedbackAttachment } from '@/lib/api/feedbackAttachments';
import { cn } from '@/lib/utils';

export function PTAppFeedbackDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['pt-feedback-ticket', ticketId, user?.id],
    queryFn: () => getPtFeedbackTicket(ticketId!, user!.id),
    enabled: !!ticketId && !!user?.id,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['pt-feedback-messages', ticketId],
    queryFn: () => listTicketMessages(ticketId!),
    enabled: !!ticketId && !!ticket,
  });

  const canReply = ticket && ['open', 'in_progress'].includes(ticket.status);

  const handleSend = async () => {
    if (!user?.id || !ticketId) return;
    setSending(true);
    try {
      await sendPtFeedbackReply({
        ticketId,
        userId: user.id,
        message: reply,
        files,
      });
      setReply('');
      setFiles([]);
      await queryClient.invalidateQueries({ queryKey: ['pt-feedback-messages', ticketId] });
      await queryClient.invalidateQueries({ queryKey: ['pt-feedback-tickets'] });
      await queryClient.invalidateQueries({ queryKey: ['pt-feedback-ticket', ticketId] });
      toast.success('Messaggio inviato');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Errore invio');
    } finally {
      setSending(false);
    }
  };

  if (isLoading || !ticket) {
    return (
      <PTAppPageShell title="Feedback" showBack backTo="/pt/app/feedback">
        <p className="text-center text-sm text-app-muted-foreground py-12">Caricamento…</p>
      </PTAppPageShell>
    );
  }

  return (
    <PTAppPageShell title={ticket.subject} showBack backTo="/pt/app/feedback" flush>
      <div className="px-4 pb-24 space-y-4">
        <p className="text-xs text-app-muted-foreground">
          {ticketStatusLabel(ticket.status)} ·{' '}
          {format(new Date(ticket.created_at), "d MMMM yyyy 'alle' HH:mm", { locale: it })}
        </p>

        <div className="rounded-xl border border-app-border bg-app-card p-3">
          <p className="text-xs font-medium text-app-muted-foreground mb-1">Tu</p>
          <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
          <FeedbackAttachmentList paths={ticket.attachments ?? []} />
        </div>

        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div
              key={m.id}
              className={cn(
                'rounded-xl border p-3',
                mine
                  ? 'border-app-border bg-app-card ml-4'
                  : 'border-pt-primary/30 bg-pt-primary/5 mr-4',
              )}
            >
              <p className="text-xs font-medium text-app-muted-foreground mb-1">
                {mine ? 'Tu' : 'Team Livelapp'} ·{' '}
                {format(new Date(m.created_at), 'd MMM HH:mm', { locale: it })}
              </p>
              <p className="text-sm whitespace-pre-wrap">{m.message}</p>
              <FeedbackAttachmentList paths={m.attachments ?? []} />
            </div>
          );
        })}

        {canReply && (
          <div className="fixed bottom-0 left-0 right-0 border-t border-app-border bg-app-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {files.length > 0 && (
              <p className="text-xs text-app-muted-foreground mb-2">{files.length} allegato/i</p>
            )}
            <div className="flex gap-2 items-end">
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  const list = e.target.files;
                  if (!list) return;
                  const next = [...files];
                  for (const f of Array.from(list)) {
                    const err = validateFeedbackAttachment(f);
                    if (err) {
                      toast.error(err);
                      continue;
                    }
                    next.push(f);
                  }
                  setFiles(next);
                  e.target.value = '';
                }}
              />
              <Button type="button" variant="outline" size="icon" onClick={() => fileRef.current?.click()}>
                <Paperclip className="h-4 w-4" />
              </Button>
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Aggiungi un messaggio…"
                rows={2}
                className="resize-none flex-1 min-h-[44px]"
              />
              <Button type="button" size="icon" disabled={sending} onClick={handleSend}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </div>
    </PTAppPageShell>
  );
}

export default PTAppFeedbackDetailPage;
