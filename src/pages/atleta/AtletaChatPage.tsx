import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ChatList } from '@/components/app/ChatList';
import { ChatMessages } from '@/components/app/ChatMessages';
import { getOrCreateChat, getChatMessages, sendMessage, markMessagesAsRead, subscribeToMessages } from '@/lib/api/messages';
import { toast } from 'sonner';
import { buildCoachFullName } from '@/lib/coachName';

// =====================================================
// ATLETA CHAT PAGE - Chat with PT
// Design reference: Ladder_iOS_109, Ladder_iOS_126
// =====================================================

export function AtletaChatPage() {
  const { recipientId } = useParams<{ recipientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch chats list — parte dalle CONNESSIONI ATTIVE PT, non dai messaggi
  // Così il coach è sempre visibile anche senza messaggi.
  const { data: chats, isLoading: chatsLoading } = useQuery({
    queryKey: ['atleta-chats', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // 1. Connessioni attive (coach collegati)
      const { data: connections, error: connErr } = await supabase
        .from('pt_atleta_connections')
        .select('pt_user_id')
        .eq('atleta_user_id', user.id)
        .eq('status', 'active');

      if (connErr) throw connErr;

      const ptIds = (connections || []).map((c) => c.pt_user_id);
      if (ptIds.length === 0) return [];

      // 2. Chat esistenti per queste connessioni
      const { data: existingChats } = await supabase
        .from('chats')
        .select('id, pt_user_id, last_message_at')
        .eq('atleta_user_id', user.id)
        .eq('is_active', true)
        .in('pt_user_id', ptIds);

      const chatByPt = new Map(
        (existingChats || []).map((c) => [c.pt_user_id, c]),
      );

      // 3. Profili coach
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, avatar_url')
        .in('user_id', ptIds);
      const profileByUser = new Map(
        (profiles || []).map((p) => [p.user_id, p]),
      );

      // 4. Ultimo messaggio + non letti per chat esistenti
      const enriched = await Promise.all(
        ptIds.map(async (ptId) => {
          const chat = chatByPt.get(ptId);
          const profile = profileByUser.get(ptId);
          const realName = buildCoachFullName(
            profile?.first_name,
            profile?.last_name,
          );

          let lastMessage: string | undefined;
          let lastMessageAt: string | undefined = chat?.last_message_at ?? undefined;
          let unreadCount = 0;

          if (chat?.id) {
            const { data: lastMsg } = await supabase
              .from('messages')
              .select('content, created_at')
              .eq('chat_id', chat.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            lastMessage = lastMsg?.content ?? undefined;
            lastMessageAt = lastMsg?.created_at ?? lastMessageAt;

            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('chat_id', chat.id)
              .neq('sender_user_id', user.id)
              .eq('is_read', false);
            unreadCount = count || 0;
          }

          return {
            id: chat?.id ?? `pending-${ptId}`,
            recipientUserId: ptId,
            name: realName ?? 'Il tuo Coach',
            avatarUrl: profile?.avatar_url,
            lastMessage: lastMessage ?? (chat ? undefined : 'Nessuna conversazione'),
            lastMessageAt,
            unreadCount,
            _hasChat: !!chat,
          };
        }),
      );

      // Ordina: chat con messaggi recenti prima, poi senza
      enriched.sort((a, b) => {
        if (a.lastMessageAt && b.lastMessageAt) {
          return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        }
        if (a.lastMessageAt) return -1;
        if (b.lastMessageAt) return 1;
        return a.name.localeCompare(b.name);
      });

      return enriched;
    },
    enabled: !!user?.id,
  });

  // Get current chat from existing list
  const existingChat = chats?.find(c => c.recipientUserId === recipientId);

  // If recipientId is provided but no chat exists yet → create it on the fly
  const { data: createdChat, isLoading: creatingChat } = useQuery({
    queryKey: ['atleta-create-chat', user?.id, recipientId],
    queryFn: async () => {
      if (!user?.id || !recipientId) return null;
      // recipientId è il PT, user.id è l'atleta
      const chat = await getOrCreateChat(recipientId, user.id);
      return chat;
    },
    enabled: !!user?.id && !!recipientId && !chatsLoading && !existingChat,
    retry: false,
  });

  // Refetch chat list once a new chat has been created so it appears in sidebar
  useEffect(() => {
    if (createdChat) {
      queryClient.invalidateQueries({ queryKey: ['atleta-chats', user?.id] });
    }
  }, [createdChat, queryClient, user?.id]);

  // Resolve current chat: existing one OR newly created
  const currentChat = existingChat ?? (createdChat
    ? {
        id: createdChat.id,
        recipientUserId: recipientId!,
        name: 'Il tuo Coach',
        avatarUrl: undefined as string | undefined,
        lastMessage: undefined as string | undefined,
        lastMessageAt: undefined as string | undefined,
        unreadCount: 0,
      }
    : undefined);

  // Fetch messages for selected chat
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['chat-messages', currentChat?.id],
    queryFn: async () => {
      if (!currentChat?.id) return [];
      
      const messagesData = await getChatMessages(currentChat.id);
      
      // Fetch sender profiles
      const messagesWithProfiles = await Promise.all(
        messagesData.map(async (msg) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('user_id', msg.sender_user_id)
            .single();

          return {
            id: msg.id,
            content: msg.content || '',
            senderUserId: msg.sender_user_id,
            senderName: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User' : 'User',
            senderAvatar: profile?.avatar_url,
            createdAt: msg.created_at,
            isRead: msg.is_read,
          };
        })
      );

      return messagesWithProfiles;
    },
    enabled: !!currentChat?.id,
  });

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!currentChat?.id || !user?.id) throw new Error('Chat not found');
      return sendMessage({
        chatId: currentChat.id,
        senderUserId: user.id,
        content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', currentChat?.id] });
      queryClient.invalidateQueries({ queryKey: ['atleta-chats'] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Mark messages as read
  useEffect(() => {
    if (currentChat?.id && user?.id) {
      markMessagesAsRead(currentChat.id, user.id);
    }
  }, [currentChat?.id, user?.id]);

  // Subscribe to new messages
  useEffect(() => {
    if (!currentChat?.id) return;

    const unsubscribe = subscribeToMessages(currentChat.id, () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', currentChat.id] });
      if (user?.id) {
        markMessagesAsRead(currentChat.id, user.id);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentChat?.id, user?.id, queryClient]);

  // Show chat detail if recipientId is provided
  if (recipientId && (currentChat || creatingChat)) {
    return (
      <div className="h-full min-h-0 bg-app-background">
        <ChatMessages
          recipientName={currentChat?.name ?? 'Il tuo Coach'}
          recipientAvatar={currentChat?.avatarUrl}
          messages={messages || []}
          currentUserId={user?.id || ''}
          onBack={() => navigate('/app/chat')}
          onSend={(content) => sendMutation.mutate(content)}
          onAttach={() => toast.info('Allegati in arrivo')}
          isLoading={messagesLoading || creatingChat}
        />
      </div>
    );
  }

  // Show chat list
  return (
    <div className="h-full min-h-0 bg-app-background">
      <ChatList
        chats={chats || []}
        isLoading={chatsLoading}
        basePath="/app/chat"
        showTabs={true}
      />
    </div>
  );
}

export default AtletaChatPage;
