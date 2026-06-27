import { supabase } from '@/integrations/supabase/client';

export type EventCommentRow = {
  id: string;
  event_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_comment_id: string | null;
  profile: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
};

export type EventCommentThread = EventCommentRow & {
  replies: EventCommentRow[];
};

export function commentAuthorName(c: EventCommentRow): string {
  const n = [c.profile?.first_name, c.profile?.last_name].filter(Boolean).join(' ').trim();
  return n || 'Utente';
}

export async function loadEventComments(eventId: string): Promise<EventCommentThread[]> {
  const { data, error } = await supabase
    .from('event_comments')
    .select('id, event_id, user_id, content, created_at, parent_comment_id')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!data?.length) return [];

  const userIds = [...new Set(data.map((r) => r.user_id))];
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name, avatar_url')
    .in('user_id', userIds);

  if (profErr) throw profErr;
  const byUser = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));

  const rows: EventCommentRow[] = data.map((row) => ({
    ...row,
    profile: byUser[row.user_id] ?? null,
  }));

  // Build 1-level tree: roots + their replies
  const roots: EventCommentThread[] = [];
  const byId: Record<string, EventCommentThread> = {};
  for (const r of rows) {
    if (!r.parent_comment_id) {
      const t: EventCommentThread = { ...r, replies: [] };
      byId[r.id] = t;
      roots.push(t);
    }
  }
  for (const r of rows) {
    if (r.parent_comment_id && byId[r.parent_comment_id]) {
      byId[r.parent_comment_id].replies.push(r);
    }
  }
  return roots;
}

export async function countEventComments(eventIds: string[]): Promise<Record<string, number>> {
  if (eventIds.length === 0) return {};

  const { data, error } = await supabase
    .from('event_comments')
    .select('event_id')
    .in('event_id', eventIds);

  if (error) throw error;

  const out: Record<string, number> = {};
  for (const id of eventIds) out[id] = 0;
  for (const row of data || []) {
    out[row.event_id] = (out[row.event_id] ?? 0) + 1;
  }
  return out;
}

export async function postEventComment(
  eventId: string,
  userId: string,
  content: string,
  parentCommentId?: string | null,
): Promise<void> {
  const trimmed = content.trim();
  if (!trimmed) throw new Error('Il commento è vuoto');

  const { error } = await supabase.from('event_comments').insert({
    event_id: eventId,
    user_id: userId,
    content: trimmed,
    parent_comment_id: parentCommentId ?? null,
  });
  if (error) throw error;
}

export async function deleteEventComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('event_comments').delete().eq('id', commentId);
  if (error) throw error;
}
