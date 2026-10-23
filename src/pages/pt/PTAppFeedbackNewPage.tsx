import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';
import { FeedbackComposeForm } from '@/components/feedback/FeedbackComposeForm';
import { useAuth } from '@/hooks/useAuth';
import { createPtFeedbackTicket } from '@/lib/api/feedbackTickets';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function PTAppFeedbackNewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  return (
    <PTAppPageShell
      title="Nuovo feedback"
      description="Il team legge ogni messaggio"
      showBack
      backTo="/pt/app/feedback"
    >
      <div className="rounded-2xl border border-app-border bg-app-card p-4">
        <FeedbackComposeForm
          compact
          submitting={submitting}
          onSubmit={async (data) => {
            if (!user?.id) return;
            setSubmitting(true);
            try {
              const ticket = await createPtFeedbackTicket({
                userId: user.id,
                category: data.category,
                body: data.body,
                subject: data.subject,
                files: data.files,
              });
              await queryClient.invalidateQueries({ queryKey: ['pt-feedback-tickets'] });
              toast.success('Inviato! Ti risponderemo qui e nelle notifiche.');
              navigate(`/pt/app/feedback/${ticket.id}`, { replace: true });
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Errore invio');
            } finally {
              setSubmitting(false);
            }
          }}
        />
      </div>
    </PTAppPageShell>
  );
}

export default PTAppFeedbackNewPage;
