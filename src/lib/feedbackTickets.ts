export const PT_FEEDBACK_CATEGORIES = [
  'pt_suggestion',
  'pt_bug',
  'pt_change',
  'pt_other',
] as const;

export type PtFeedbackCategory = (typeof PT_FEEDBACK_CATEGORIES)[number];

export const PT_FEEDBACK_CATEGORY_LABELS: Record<PtFeedbackCategory, string> = {
  pt_suggestion: 'Suggerimento',
  pt_bug: 'Bug',
  pt_change: 'Modifica da fare',
  pt_other: 'Altro',
};

export function isPtFeedbackCategory(category: string | null | undefined): boolean {
  return !!category && category.startsWith('pt_');
}

export function defaultFeedbackSubject(category: PtFeedbackCategory): string {
  const label = PT_FEEDBACK_CATEGORY_LABELS[category];
  const d = new Date();
  const date = d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  return `${label} — ${date}`;
}

export function ticketStatusLabel(status: string): string {
  const map: Record<string, string> = {
    open: 'Aperto',
    in_progress: 'In lavorazione',
    resolved: 'Risolto',
    closed: 'Chiuso',
  };
  return map[status] ?? status;
}

/** Ultimo messaggio pubblico dall'admin → il PT ha una risposta da leggere */
export function ptHasUnreadAdminReply(
  ticket: {
    user_id: string;
    last_public_sender_id: string | null;
    status: string;
  },
  viewerId: string,
): boolean {
  if (ticket.user_id !== viewerId) return false;
  if (!['open', 'in_progress'].includes(ticket.status)) return false;
  if (!ticket.last_public_sender_id) return false;
  return ticket.last_public_sender_id !== ticket.user_id;
}
