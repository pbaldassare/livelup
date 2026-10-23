import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';
import { useAuth } from '@/hooks/useAuth';
import { listMyPtFeedbackTickets } from '@/lib/api/feedbackTickets';
import {
  PT_FEEDBACK_CATEGORY_LABELS,
  ptHasUnreadAdminReply,
  ticketStatusLabel,
  type PtFeedbackCategory,
} from '@/lib/feedbackTickets';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquarePlus, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export function PTAppFeedbackPage() {
  const { user } = useAuth();
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['pt-feedback-tickets', user?.id],
    queryFn: () => listMyPtFeedbackTickets(user!.id),
    enabled: !!user?.id,
  });

  return (
    <PTAppPageShell
      title="Suggerimenti e modifiche"
      description="Invia idee e richieste al team Livelapp"
      showBack
      backTo="/pt/app"
      actions={
        <Button size="sm" asChild className="bg-pt-primary text-pt-primary-foreground">
          <Link to="/pt/app/feedback/new">
            <MessageSquarePlus className="mr-1 h-4 w-4" />
            Nuovo
          </Link>
        </Button>
      }
    >
      {isLoading ? (
        <p className="text-sm text-app-muted-foreground py-8 text-center">Caricamento…</p>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl border border-app-border bg-app-card p-8 text-center">
          <p className="text-sm text-app-muted-foreground mb-4">
            Non hai ancora inviato feedback. Raccontaci cosa migliorare sulla piattaforma.
          </p>
          <Button asChild>
            <Link to="/pt/app/feedback/new">Scrivi il primo messaggio</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {tickets.map((t) => {
            const cat = (t.category ?? 'pt_other') as PtFeedbackCategory;
            const unread = user && ptHasUnreadAdminReply(t, user.id);
            return (
              <li key={t.id}>
                <Link
                  to={`/pt/app/feedback/${t.id}`}
                  className="flex items-center gap-3 rounded-xl border border-app-border bg-app-card p-4 active:bg-app-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-app-foreground truncate">{t.subject}</p>
                      {unread && (
                        <Badge className="bg-pt-primary/20 text-pt-primary border-0 text-[10px]">
                          Nuova risposta
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-app-muted-foreground mt-0.5">
                      {PT_FEEDBACK_CATEGORY_LABELS[cat]} · {ticketStatusLabel(t.status)} ·{' '}
                      {format(new Date(t.updated_at), 'd MMM yyyy', { locale: it })}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-app-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PTAppPageShell>
  );
}

export default PTAppFeedbackPage;
