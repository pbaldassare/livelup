import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ChatList } from '@/components/app/ChatList';
import { ChatMessages } from '@/components/app/ChatMessages';
import { getOrCreateChat, getChatMessages, sendMessage, markMessagesAsRead, subscribeToMessages } from '@/lib/api/messages';
import { toast } from 'sonner';

// =====================================================
// ATLETA CHAT PAGE - Chat with PT
// Design reference: Ladder_iOS_109, Ladder_iOS_126
// =====================================================

export function AtletaChatPage() {
  const { recipientId } = useParams<{ recipientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch chats list
  const { data: chats, isLoading: chatsLoading } = useQuery({
    queryKey: ['atleta-chats', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('chats')
        .select('id, pt_user_id, last_message_at, is_active')
        .eq('atleta_user_id', user.id)
        .eq('is_active', true)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Fetch PT profiles and last messages
      const chatsWithDetails = await Promise.all(
        (data || []).map(async (chat) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('user_id', chat.pt_user_id)
            .single();

          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content, sender_user_id, created_at, is_read')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chat.id)
            .neq('sender_user_id', user.id)
            .eq('is_read', false);

          return {
            id: chat.id,
            recipientUserId: chat.pt_user_id,
            name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Coach' : 'Coach',
            avatarUrl: profile?.avatar_url,
            lastMessage: lastMessage?.content,
            lastMessageAt: lastMessage?.created_at,
            unreadCount: unreadCount || 0,
          };
        })
      );

      return chatsWithDetails;
    },
    enabled: !!user?.id,
  });

  // Get current chat
  const currentChat = chats?.find(c => c.recipientUserId === recipientId);

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
  if (recipientId && currentChat) {
    return (
      <div className="h-full min-h-0 bg-app-background">
        <ChatMessages
          recipientName={currentChat.name}
          recipientAvatar={currentChat.avatarUrl}
          messages={messages || []}
          currentUserId={user?.id || ''}
          onBack={() => navigate('/app/chat')}
          onSend={(content) => sendMutation.mutate(content)}
          onAttach={() => toast.info('Allegati in arrivo')}
          isLoading={messagesLoading}
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
