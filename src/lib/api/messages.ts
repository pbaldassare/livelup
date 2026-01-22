// =====================================================
// API: Gestione Chat e Messaggi
// Real-time messaging
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import type { Chat, Message } from '@/types/database';

// =====================================================
// OTTIENI O CREA CHAT
// =====================================================

export async function getOrCreateChat(ptUserId: string, atletaUserId: string): Promise<Chat> {
  // Cerca chat esistente
  const { data: existingChat, error: searchError } = await supabase
    .from('chats')
    .select('*')
    .eq('pt_user_id', ptUserId)
    .eq('atleta_user_id', atletaUserId)
    .single();

  if (existingChat) {
    return existingChat as Chat;
  }

  if (searchError && searchError.code !== 'PGRST116') {
    throw new Error('Errore ricerca chat: ' + searchError.message);
  }

  // Crea nuova chat
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
}) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_id: params.chatId,
      sender_user_id: params.senderUserId,
      content: params.content,
      attachment_url: params.attachmentUrl,
      attachment_type: params.attachmentType,
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
  const { error } = await supabase
    .from('messages')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('chat_id', chatId)
    .neq('sender_user_id', userId)
    .eq('is_read', false);

  if (error) {
    throw new Error('Errore aggiornamento lettura: ' + error.message);
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

// =====================================================
// SUBSCRIBE A NUOVI MESSAGGI (REALTIME)
// =====================================================

export function subscribeToMessages(
  chatId: string,
  callback: (message: Message) => void
) {
  const channel = supabase
    .channel(`messages:${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => {
        callback(payload.new as Message);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
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
