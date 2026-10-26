import { supabase } from '@/integrations/supabase/client';
import type { PtFeedbackCategory } from '@/lib/feedbackTickets';
import { defaultFeedbackSubject, isPtFeedbackCategory } from '@/lib/feedbackTickets';
import { uploadFeedbackAttachment } from '@/lib/api/feedbackAttachments';

export interface FeedbackTicketRow {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  category: string | null;
  status: string;
  priority: string;
  attachments: string[] | null;
  needs_admin_reply: boolean;
  last_public_sender_id: string | null;
  last_public_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketMessageRow {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_internal: boolean;
  attachments: string[] | null;
  created_at: string;
}

export async function createPtFeedbackTicket(input: {
  userId: string;
  category: PtFeedbackCategory;
  body: string;
  subject?: string;
  files?: File[];
}): Promise<FeedbackTicketRow> {
  const subject = (input.subject?.trim() || defaultFeedbackSubject(input.category)).slice(0, 200);
  const description = input.body.trim();
  if (!description) throw new Error('Scrivi un messaggio');

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .insert({
      user_id: input.userId,
      subject,
      description,
      category: input.category,
      priority: 'medium',
      status: 'open',
      attachments: [],
      metadata: { source: 'pt' },
    })
    .select('*')
    .returns<FeedbackTicketRow[]>()
    .single();

  if (error || !ticket) throw new Error(error?.message ?? 'Errore creazione ticket');

  const paths: string[] = [];
  for (const file of input.files ?? []) {
    paths.push(await uploadFeedbackAttachment(file, input.userId, ticket.id));
  }

  if (paths.length > 0) {
    const { error: updErr } = await supabase
      .from('support_tickets')
      .update({ attachments: paths })
      .eq('id', ticket.id);
    if (updErr) throw new Error(updErr.message);
    ticket.attachments = paths;
  }

  return ticket as FeedbackTicketRow;
}

export async function listMyPtFeedbackTickets(userId: string): Promise<FeedbackTicketRow[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .returns<FeedbackTicketRow[]>()
    .eq('user_id', userId)
    .like('category', 'pt_%')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as FeedbackTicketRow[];
}

export async function getPtFeedbackTicket(
  ticketId: string,
  userId: string,
): Promise<FeedbackTicketRow | null> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .returns<FeedbackTicketRow[]>()
    .eq('id', ticketId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (data && !isPtFeedbackCategory(data.category)) return null;
  return data as FeedbackTicketRow | null;
}

export async function listTicketMessages(ticketId: string): Promise<TicketMessageRow[]> {
  const { data, error } = await supabase
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .eq('is_internal', false)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as TicketMessageRow[];
}

export async function sendPtFeedbackReply(input: {
  ticketId: string;
  userId: string;
  message: string;
  files?: File[];
}): Promise<void> {
  const text = input.message.trim();
  if (!text && !(input.files?.length)) throw new Error('Scrivi un messaggio o allega un file');

  const paths: string[] = [];
  for (const file of input.files ?? []) {
    paths.push(await uploadFeedbackAttachment(file, input.userId, input.ticketId));
  }

  const { error } = await supabase.from('ticket_messages').insert({
    ticket_id: input.ticketId,
    sender_id: input.userId,
    message: text || '(allegato)',
    is_internal: false,
    attachments: paths.length ? paths : [],
  });

  if (error) throw error;
}

export async function listAdminPtFeedbackTickets(filters?: {
  pendingReplyOnly?: boolean;
  status?: string;
}): Promise<FeedbackTicketRow[]> {
  let q = supabase
    .from('support_tickets')
    .select('*')
    .returns<FeedbackTicketRow[]>()
    .like('category', 'pt_%')
    .order('updated_at', { ascending: false });

  const { data, error } = await q;
  if (error) throw error;

  let rows = (data ?? []) as FeedbackTicketRow[];
  if (filters?.status && filters.status !== 'all') {
    rows = rows.filter((r) => r.status === filters.status);
  }
  if (filters?.pendingReplyOnly) {
    rows = rows.filter(
      (r) => r.needs_admin_reply && ['open', 'in_progress'].includes(r.status),
    );
  }
  return rows;
}
