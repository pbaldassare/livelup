// =====================================================
// API: Gruppi chat PT — creazione, membri, messaggi, realtime
// Gruppo chat creato dal PT con un sottoinsieme dei propri atleti collegati.
// Riusa la tabella `messages` (chat_group_id) per i messaggi.
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import type { Message } from '@/types/database';
import type { ChatGroupMemberRow, ChatGroupRow, ChatGroupWithMeta } from '@/types/chatGroups';

// Cast tipizzato manualmente fino a rigenerazione types.ts (tabelle nuove non ancora note al client generato)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabase as any;

// =====================================================
// CRUD GRUPPO
// =====================================================

export async function createChatGroup(
  ptUserId: string,
  name: string,
  athleteIds: string[],
): Promise<ChatGroupRow> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Il nome del gruppo è obbligatorio');
  if (athleteIds.length === 0) throw new Error('Seleziona almeno un atleta');

  const { data: group, error } = await db()
    .from('pt_chat_groups')
    .insert({ pt_user_id: ptUserId, name: trimmed })
    .select()
    .single();

  if (error) throw new Error('Errore creazione gruppo: ' + error.message);

  const memberRows = athleteIds.map((atleta_user_id) => ({
    group_id: group.id,
    atleta_user_id,
  }));

  const { error: membersError } = await db().from('pt_chat_group_members').insert(memberRows);
  if (membersError) {
    throw new Error('Gruppo creato ma errore aggiunta membri: ' + membersError.message);
  }

  return group as ChatGroupRow;
}

export async function renameChatGroup(groupId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Il nome del gruppo è obbligatorio');
  const { error } = await db().from('pt_chat_groups').update({ name: trimmed }).eq('id', groupId);
  if (error) throw new Error(error.message);
}

export async function deleteChatGroup(groupId: string): Promise<void> {
  const { error } = await db().from('pt_chat_groups').delete().eq('id', groupId);
  if (error) throw new Error(error.message);
}

export async function getChatGroup(groupId: string): Promise<ChatGroupRow | null> {
  const { data, error } = await db().from('pt_chat_groups').select('*').eq('id', groupId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ChatGroupRow) || null;
}

async function attachGroupMeta(groups: ChatGroupRow[], userId: string): Promise<ChatGroupWithMeta[]> {
  if (groups.length === 0) return [];
  const ids = groups.map((g) => g.id);

  const { data: members } = await db()
    .from('pt_chat_group_members')
    .select('group_id')
    .in('group_id', ids);

  const memberCountByGroup = new Map<string, number>();
  for (const m of members || []) {
    memberCountByGroup.set(m.group_id, (memberCountByGroup.get(m.group_id) || 0) + 1);
  }

  const { data: reads } = await db()
    .from('pt_chat_group_reads')
    .select('group_id, last_read_at')
    .eq('user_id', userId)
    .in('group_id', ids);

  const lastReadByGroup = new Map<string, string>();
  for (const r of reads || []) {
    lastReadByGroup.set(r.group_id, r.last_read_at);
  }

  return Promise.all(
    groups.map(async (g) => {
      const { data: lastMsg } = await db()
        .from('messages')
        .select('content, attachment_type, sender_user_id, created_at')
        .eq('chat_group_id', g.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastReadAt = lastReadByGroup.get(g.id);
      let unreadQuery = db()
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_group_id', g.id)
        .neq('sender_user_id', userId);
      if (lastReadAt) {
        unreadQuery = unreadQuery.gt('created_at', lastReadAt);
      }
      const { count } = await unreadQuery;

      return {
        ...g,
        members_count: memberCountByGroup.get(g.id) || 0,
        last_message: lastMsg || null,
        unread_count: count || 0,
      } as ChatGroupWithMeta;
    }),
  );
}

export async function getPTChatGroups(ptUserId: string): Promise<ChatGroupWithMeta[]> {
  const { data, error } = await db()
    .from('pt_chat_groups')
    .select('*')
    .eq('pt_user_id', ptUserId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return attachGroupMeta((data || []) as ChatGroupRow[], ptUserId);
}

export async function getAthleteChatGroups(athleteUserId: string): Promise<ChatGroupWithMeta[]> {
  const { data: memberships, error: mErr } = await db()
    .from('pt_chat_group_members')
    .select('group_id')
    .eq('atleta_user_id', athleteUserId);
  if (mErr) throw new Error(mErr.message);

  const groupIds = (memberships || []).map((m: { group_id: string }) => m.group_id);
  if (groupIds.length === 0) return [];

  const { data, error } = await db()
    .from('pt_chat_groups')
    .select('*')
    .in('id', groupIds)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return attachGroupMeta((data || []) as ChatGroupRow[], athleteUserId);
}

// =====================================================
// MEMBRI
// =====================================================

export async function getChatGroupMembers(groupId: string): Promise<ChatGroupMemberRow[]> {
  const { data, error } = await db()
    .from('pt_chat_group_members')
    .select(
      `id, group_id, atleta_user_id, added_at,
       profiles:atleta_user_id (first_name, last_name, avatar_url, email)`,
    )
    .eq('group_id', groupId)
    .order('added_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function addChatGroupMembers(groupId: string, athleteIds: string[]): Promise<void> {
  if (athleteIds.length === 0) return;
  const rows = athleteIds.map((atleta_user_id) => ({ group_id: groupId, atleta_user_id }));
  const { error } = await db().from('pt_chat_group_members').upsert(rows, {
    onConflict: 'group_id,atleta_user_id',
    ignoreDuplicates: true,
  });
  if (error) throw new Error(error.message);
}

export async function removeChatGroupMember(groupId: string, atletaUserId: string): Promise<void> {
  const { error } = await db()
    .from('pt_chat_group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('atleta_user_id', atletaUserId);
  if (error) throw new Error(error.message);
}

// =====================================================
// MESSAGGI
// =====================================================

export async function getChatGroupMessages(groupId: string, limit = 50, before?: string): Promise<Message[]> {
  let query = db()
    .from('messages')
    .select('*')
    .eq('chat_group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) query = query.lt('created_at', before);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data || []) as Message[]).reverse();
}

export async function sendChatGroupMessage(params: {
  groupId: string;
  senderUserId: string;
  content: string;
  attachmentUrl?: string;
  attachmentType?: string;
}): Promise<Message> {
  const { data, error } = await db()
    .from('messages')
    .insert({
      chat_group_id: params.groupId,
      sender_user_id: params.senderUserId,
      content: params.content || null,
      attachment_url: params.attachmentUrl,
      attachment_type: params.attachmentType,
    })
    .select()
    .single();
  if (error) throw new Error('Errore invio messaggio: ' + error.message);
  return data as Message;
}

export function subscribeToChatGroupMessages(groupId: string, callback: (message: Message) => void) {
  const channel = supabase
    .channel(`chat-group-messages:${groupId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_group_id=eq.${groupId}`,
      },
      (payload) => {
        callback(payload.new as Message);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function markChatGroupRead(groupId: string, userId: string): Promise<void> {
  const { error } = await db()
    .from('pt_chat_group_reads')
    .upsert({ group_id: groupId, user_id: userId, last_read_at: new Date().toISOString() }, {
      onConflict: 'group_id,user_id',
    });
  if (error) throw new Error(error.message);
}
