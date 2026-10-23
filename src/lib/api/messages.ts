// =====================================================
// API: Gestione Chat e Messaggi
// Real-time messaging
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import type { Chat, Message } from '@/types/database';
import { groupReactions, resolveReplyPreview, type ChatReaction } from '@/lib/chatThread';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabase as any;

// =====================================================
// OTTIENI O CREA CHAT
// =====================================================

export async function getOrCreateChat(ptUserId: string, atletaUserId: string): Promise<Chat> {
  // Cerca chat esistente (maybeSingle per non lanciare errore se non esiste)
  const { data: existingChat, error: searchError } = await supabase
    .from('chats')
    .select('*')
    .eq('pt_user_id', ptUserId)
    .eq('atleta_user_id', atletaUserId)
    .maybeSingle();

  if (searchError) {
    throw new Error('Errore ricerca chat: ' + searchError.message);
  }

  if (existingChat) {
    return existingChat as Chat;
  }

  // Crea nuova chat (RLS: connessione active/pending, o inquiry atleta→PT via can_chat_with)
  const { data: newChat, error: createError } = await supabase
    .from('chats')
    .insert({
      pt_user_id: ptUserId,
      atleta_user_id: atletaUserId,
      is_active: true,
    })
    .select()
    .single();

  if (createError) {
    // Race condition: se due chiamate arrivano insieme, la seconda fallisce per duplicato → recupera quella esistente
    const { data: retryChat } = await supabase
      .from('chats')
      .select('*')
      .eq('pt_user_id', ptUserId)
      .eq('atleta_user_id', atletaUserId)
      .maybeSingle();
    if (retryChat) return retryChat as Chat;
    throw new Error('Errore creazione chat: ' + createError.message);
  }

  return newChat as Chat;
}

// =====================================================
// OTTIENI CHATS UTENTE
// =====================================================

export async function getUserChats(userId: string) {
  const { data, error } = await supabase
    .from('chats')
    .select(`
      *,
      pt_profile:pt_user_id (
        first_name,
        last_name,
        avatar_url
      ),
      atleta_profile:atleta_user_id (
        first_name,
        last_name,
        avatar_url
      ),
      messages (
        id,
        content,
        created_at,
        is_read,
        sender_user_id
      )
    `)
    .or(`pt_user_id.eq.${userId},atleta_user_id.eq.${userId}`)
    .eq('is_active', true)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (error) {
    throw new Error('Errore recupero chats: ' + error.message);
  }

  return data;
}

// =====================================================
// OTTIENI MESSAGGI CHAT
// =====================================================

export async function getChatMessages(chatId: string, limit = 50, before?: string) {
  let query = supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Errore recupero messaggi: ' + error.message);
  }

  // Ritorna in ordine cronologico
  return (data as Message[]).reverse();
}

// =====================================================
// INVIA MESSAGGIO
// =====================================================

export async function sendMessage(params: {
  chatId: string;
  senderUserId: string;
  content: string;
  attachmentUrl?: string;
  attachmentType?: string;
  replyToId?: string;
}) {
  const { data, error } = await db()
    .from('messages')
    .insert({
      chat_id: params.chatId,
      sender_user_id: params.senderUserId,
      content: params.content,
      attachment_url: params.attachmentUrl,
      attachment_type: params.attachmentType,
      reply_to_id: params.replyToId ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error('Errore invio messaggio: ' + error.message);
  }

  return data as Message;
}

// =====================================================
// SEGNA MESSAGGI COME LETTI
// =====================================================

export async function markMessagesAsRead(chatId: string, userId: string) {
  // RPC SECURITY DEFINER: RLS permette UPDATE solo al mittente.
  const { error: rpcError } = await (supabase.rpc as any)('mark_messages_as_read', {
    _chat_id: chatId,
  });

  if (!rpcError) return;

  const msg = (rpcError.message ?? '').toLowerCase();
  const missingRpc =
    rpcError.code === 'PGRST202' ||
    msg.includes('mark_messages_as_read') ||
    msg.includes('could not find the function');

  if (!missingRpc) {
    throw new Error('Errore aggiornamento lettura: ' + rpcError.message);
  }

  // Fallback legacy (no-op sotto RLS attuale se la RPC manca)
  const { error: updateError } = await supabase
    .from('messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('chat_id', chatId)
    .neq('sender_user_id', userId)
    .eq('is_read', false);

  if (updateError) {
    throw new Error('Errore aggiornamento lettura: ' + updateError.message);
  }
}


// =====================================================
// CONTA MESSAGGI NON LETTI
// =====================================================

export async function countUnreadMessages(userId: string): Promise<number> {
  const { data, error } = await supabase
    .rpc('count_unread_messages', { _user_id: userId });

  if (error) {
    throw new Error('Errore conteggio: ' + error.message);
  }

  return data ?? 0;
}

export async function getMessageReactions(messageIds: string[]) {
  if (messageIds.length === 0) return [];
  const { data, error } = await db()
    .from('message_reactions')
    .select('message_id, user_id, emoji')
    .in('message_id', messageIds);
  if (error) throw new Error(error.message);
  return (data || []) as { message_id: string; user_id: string; emoji: string }[];
}

export async function toggleMessageReaction(messageId: string, userId: string, emoji: string) {
  const { data: existing } = await db()
    .from('message_reactions')
    .select('id')
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
    .maybeSingle();
  if (existing?.id) {
    const { error } = await db().from('message_reactions').delete().eq('id', existing.id);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await db()
    .from('message_reactions')
    .insert({ message_id: messageId, user_id: userId, emoji });
  if (error) throw new Error(error.message);
}

export async function setMessagePinned(messageId: string, pinned: boolean) {
  const { error } = await db().rpc('set_message_pinned', {
    _message_id: messageId,
    _pinned: pinned,
  });
  if (error) throw new Error(error.message);
}

export type ChatBubbleView = {
  id: string;
  content: string;
  senderUserId: string;
  senderName: string;
  senderAvatar?: string | null;
  createdAt: string;
  isRead: boolean;
  isPinned: boolean;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  replyTo?: { senderName: string; content: string };
  reactions: ChatReaction[];
};

export async function toChatBubbles(
  rows: Message[],
  currentUserId: string,
): Promise<ChatBubbleView[]> {
  const senderIds = [...new Set(rows.map((m) => m.sender_user_id))];
  const { data: profiles } = senderIds.length
    ? await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, avatar_url')
        .in('user_id', senderIds)
    : { data: [] as { user_id: string; first_name: string | null; last_name: string | null; email: string | null; avatar_url: string | null }[] };

  const nameOf = (userId: string) => {
    const p = (profiles || []).find((row) => row.user_id === userId);
    const name = `${p?.first_name || ''} ${p?.last_name || ''}`.trim();
    return name || p?.email || 'Utente';
  };

  const withNames = rows.map((msg) => ({
    id: msg.id,
    content: msg.content,
    senderName: nameOf(msg.sender_user_id),
  }));
  const reactionMap = groupReactions(await getMessageReactions(rows.map((m) => m.id)), currentUserId);

  return rows.map((msg) => {
    const profile = (profiles || []).find((p) => p.user_id === msg.sender_user_id);
    return {
      id: msg.id,
      content: msg.content || '',
      senderUserId: msg.sender_user_id,
      senderName: nameOf(msg.sender_user_id),
      senderAvatar: profile?.avatar_url,
      createdAt: msg.created_at,
      isRead: msg.is_read,
      isPinned: !!msg.is_pinned,
      attachmentUrl: msg.attachment_url,
      attachmentType: msg.attachment_type,
      replyTo: resolveReplyPreview(withNames, msg.reply_to_id),
      reactions: reactionMap.get(msg.id) ?? [],
    };
  });
}

// =====================================================
// SUBSCRIBE A NUOVI MESSAGGI (REALTIME)
// =====================================================

export function subscribeToMessages(
  chatId: string,
  callback: (message: Message) => void
) {
  const filter = {
    schema: 'public' as const,
    table: 'messages',
    filter: `chat_id=eq.${chatId}`,
  };
  const channel = supabase
    .channel(`messages:${chatId}`)
    .on('postgres_changes', { event: 'INSERT', ...filter }, (payload) => {
      callback(payload.new as Message);
    })
    .on('postgres_changes', { event: 'UPDATE', ...filter }, (payload) => {
      callback(payload.new as Message);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToMessageReactions(scope: string, callback: () => void) {
  const channel = supabase
    .channel(`message-reactions:${scope}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'message_reactions' },
      callback,
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

const TYPING_STALE_MS = 4000;

export type ChatTypingHandle = {
  setTyping: (typing: boolean) => void;
  unsubscribe: () => void;
};

export function subscribeToChatTyping(
  chatId: string,
  currentUserId: string,
  onPeerTyping: (typing: boolean) => void,
): ChatTypingHandle {
  let staleTimer: ReturnType<typeof setTimeout> | null = null;

  const channel = supabase
    .channel(`typing:${chatId}`)
    .on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (!payload || payload.userId === currentUserId) return;
      if (staleTimer) clearTimeout(staleTimer);
      staleTimer = null;
      if (payload.typing) {
        onPeerTyping(true);
        staleTimer = setTimeout(() => onPeerTyping(false), TYPING_STALE_MS);
      } else {
        onPeerTyping(false);
      }
    })
    .subscribe();

  const send = (typing: boolean) => {
    void channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUserId, typing },
    });
  };

  return {
    setTyping: send,
    unsubscribe() {
      if (staleTimer) clearTimeout(staleTimer);
      send(false);
      supabase.removeChannel(channel);
    },
  };
}

// =====================================================
// SUBSCRIBE A NOTIFICHE (REALTIME)
// =====================================================

export function subscribeToNotifications(
  userId: string,
  callback: (notification: any) => void
) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
