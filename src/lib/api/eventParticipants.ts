import { supabase } from '@/integrations/supabase/client';
import { getOrCreateChat, sendMessage } from '@/lib/api/messages';

export type EventParticipantStatus = 'registered' | 'waitlist' | 'cancelled';

export type EventParticipantRow = {
  id: string;
  event_id: string;
  user_id: string;
  registered_at: string;
  status: EventParticipantStatus;
  profile: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

export type EventParticipantCounts = {
  registered: number;
  waitlist: number;
};

export function participantDisplayName(p: EventParticipantRow): string {
  const n = [p.profile?.first_name, p.profile?.last_name].filter(Boolean).join(' ').trim();
  return n || 'Utente';
}

export async function loadEventParticipants(eventId: string): Promise<EventParticipantRow[]> {
  const { data, error } = await supabase
    .from('event_participants')
    .select('id, event_id, user_id, registered_at, status')
    .eq('event_id', eventId)
    .in('status', ['registered', 'waitlist'])
    .order('registered_at', { ascending: true });

  if (error) throw error;
  if (!data?.length) return [];

  const userIds = [...new Set(data.map((r) => r.user_id))];
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name, avatar_url, email, phone')
    .in('user_id', userIds);

  if (profErr) throw profErr;

  const byUser = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));

  return data.map((row) => ({
    ...row,
    status: row.status as EventParticipantStatus,
    profile: byUser[row.user_id] ?? null,
  }));
}

export async function countEventParticipants(eventIds: string[]): Promise<Record<string, EventParticipantCounts>> {
  if (eventIds.length === 0) return {};

  const { data, error } = await supabase
    .from('event_participants')
    .select('event_id, status')
    .in('event_id', eventIds)
    .in('status', ['registered', 'waitlist']);

  if (error) throw error;

  const out: Record<string, EventParticipantCounts> = {};
  for (const id of eventIds) {
    out[id] = { registered: 0, waitlist: 0 };
  }
  for (const row of data || []) {
    if (!out[row.event_id]) out[row.event_id] = { registered: 0, waitlist: 0 };
    if (row.status === 'registered') out[row.event_id].registered += 1;
    if (row.status === 'waitlist') out[row.event_id].waitlist += 1;
  }
  return out;
}

export async function removeEventParticipant(participantId: string, eventId: string): Promise<void> {
  const { error } = await supabase.from('event_participants').delete().eq('id', participantId);
  if (error) throw error;
  await promoteWaitlistIfSlot(eventId);
}

export async function updateParticipantStatus(
  participantId: string,
  status: EventParticipantStatus,
): Promise<void> {
  const { error } = await supabase.from('event_participants').update({ status }).eq('id', participantId);
  if (error) throw error;
}

export async function addEventParticipant(
  eventId: string,
  userId: string,
  opts?: { status?: EventParticipantStatus; maxParticipants?: number | null; isClosedNumber?: boolean },
): Promise<EventParticipantStatus> {
  const status = opts?.status ?? 'registered';

  if (opts?.isClosedNumber && opts.maxParticipants != null && status === 'registered') {
    const { count, error: countErr } = await supabase
      .from('event_participants')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'registered');
    if (countErr) throw countErr;
    if ((count ?? 0) >= opts.maxParticipants) {
      throw new Error('Evento al completo — usa lista d\'attesa o aumenta il max partecipanti');
    }
  }

  const { error } = await supabase.from('event_participants').insert({
    event_id: eventId,
    user_id: userId,
    status,
  });
  if (error) throw error;
  return status;
}

export async function promoteWaitlistIfSlot(eventId: string): Promise<void> {
  const { data: event, error: evErr } = await supabase
    .from('calendar_events')
    .select('is_closed_number, max_participants')
    .eq('id', eventId)
    .maybeSingle();
  if (evErr) throw evErr;
  if (!event) return;

  if (event.is_closed_number && event.max_participants != null) {
    const { count, error: countErr } = await supabase
      .from('event_participants')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'registered');
    if (countErr) throw countErr;
    if ((count ?? 0) >= event.max_participants) return;
  }

  const { data: next, error: wlErr } = await supabase
    .from('event_participants')
    .select('id')
    .eq('event_id', eventId)
    .eq('status', 'waitlist')
    .order('registered_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (wlErr) throw wlErr;
  if (!next) return;

  await updateParticipantStatus(next.id, 'registered');
}

/** Atleta: iscrizione con gestione numero chiuso / waitlist */
export async function registerForEvent(
  eventId: string,
  userId: string,
  event: { is_closed_number: boolean; max_participants: number | null },
): Promise<'registered' | 'waitlist'> {
  let status: EventParticipantStatus = 'registered';

  if (event.is_closed_number && event.max_participants != null) {
    const { count, error } = await supabase
      .from('event_participants')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'registered');
    if (error) throw error;
    if ((count ?? 0) >= event.max_participants) {
      status = 'waitlist';
    }
  }

  const { error } = await supabase.from('event_participants').insert({
    event_id: eventId,
    user_id: userId,
    status,
  });
  if (error) throw error;
  return status === 'waitlist' ? 'waitlist' : 'registered';
}

export function exportParticipantsCsv(
  eventTitle: string,
  participants: EventParticipantRow[],
): void {
  const header = ['Nome', 'Email', 'Telefono', 'Stato', 'Iscritto il'];
  const rows = participants.map((p) => [
    participantDisplayName(p),
    p.profile?.email ?? '',
    p.profile?.phone ?? '',
    p.status === 'waitlist' ? 'Lista attesa' : 'Iscritto',
    new Date(p.registered_at).toLocaleString('it-IT'),
  ]);
  const csv = [header, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `iscritti-${eventTitle.replace(/[^\w\s-]/g, '').slice(0, 40)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function messageAllParticipants(
  ptUserId: string,
  participants: EventParticipantRow[],
  content: string,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (const p of participants.filter((x) => x.status === 'registered')) {
    try {
      const chat = await getOrCreateChat(ptUserId, p.user_id);
      await sendMessage({ chatId: chat.id, senderUserId: ptUserId, content });
      sent += 1;
    } catch {
      failed += 1;
    }
  }
  return { sent, failed };
}
