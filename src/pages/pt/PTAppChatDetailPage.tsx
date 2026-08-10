import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessages } from '@/components/app/ChatMessages';
import { getOrCreateChat, getChatMessages, sendMessage, markMessagesAsRead, subscribeToMessages } from '@/lib/api/messages';
import { uploadChatAttachment } from '@/lib/api/chatAttachments';
import { toast } from 'sonner';

// =====================================================
// PT APP CHAT DETAIL PAGE - Chat with Atleta
// Design reference: Ladder_iOS_112, Ladder_iOS_126
// =====================================================

export function PTAppChatDetailPage() {
  const { atletaId } = useParams<{ atletaId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch or create chat with atleta (getOrCreateChat gestisce sia il lookup che la creazione)
  const { data: chatData, isLoading: chatLoading } = useQuery({
    queryKey: ['pt-chat', user?.id, atletaId],
    queryFn: async () => {
      if (!user?.id || !atletaId) return null;
      const chat = await getOrCreateChat(user.id, atletaId);
      return { chatId: chat.id };
    },
    enabled: !!user?.id && !!atletaId,
    retry: false,
  });

  // Fetch atleta profile
  const { data: atletaProfile } = useQuery({
    queryKey: ['atleta-profile', atletaId],
    queryFn: async () => {
      if (!atletaId) return null;

      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, avatar_url')
        .eq('user_id', atletaId)
        .single();

      return data;
    },
    enabled: !!atletaId,
  });

  // Fetch messages
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['chat-messages', chatData?.chatId],
    queryFn: async () => {
      if (!chatData?.chatId) return [];

      const messagesData = await getChatMessages(chatData.chatId);

      // Fetch sender profiles
      const messagesWithProfiles = await Promise.all(
        messagesData.map(async (msg) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email, avatar_url')
            .eq('user_id', msg.sender_user_id)
            .single();

          return {
            id: msg.id,
            content: msg.content || '',
            senderUserId: msg.sender_user_id,
            senderName: profile
              ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || 'Utente'
              : 'Utente',
            senderAvatar: profile?.avatar_url,
            createdAt: msg.created_at,
            isRead: msg.is_read,
            attachmentUrl: msg.attachment_url,
            attachmentType: msg.attachment_type,
          };
        })
      );

      return messagesWithProfiles;
    },
    enabled: !!chatData?.chatId,
  });

  // Send message mutation (testo e/o allegato immagine/video)
  const sendMutation = useMutation({
    mutationFn: async ({ content, file }: { content: string; file?: File | null }) => {
      if (!chatData?.chatId || !user?.id) throw new Error('Chat not found');
      let attachmentUrl: string | undefined;
      let attachmentType: string | undefined;
      if (file) {
        const uploaded = await uploadChatAttachment(file, user.id, chatData.chatId);
        attachmentUrl = uploaded.url;
        attachmentType = uploaded.type;
      }
      return sendMessage({
        chatId: chatData.chatId,
        senderUserId: user.id,
        content,
        attachmentUrl,
        attachmentType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', chatData?.chatId] });
      queryClient.invalidateQueries({ queryKey: ['pt-chats'] });
      queryClient.invalidateQueries({ queryKey: ['pt-chats-with-athletes'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const refreshUnreadCaches = () => {
    queryClient.invalidateQueries({ queryKey: ['pt-chats-with-athletes'] });
    queryClient.invalidateQueries({ queryKey: ['pt-chats'] });
    queryClient.invalidateQueries({ queryKey: ['pt-app-stats'] });
  };

  // Mark messages as read
  useEffect(() => {
    if (chatData?.chatId && user?.id) {
      markMessagesAsRead(chatData.chatId, user.id)
        .then(refreshUnreadCaches)
        .catch(() => {});
    }
  }, [chatData?.chatId, user?.id, queryClient]);

  // Subscribe to new messages
  useEffect(() => {
    if (!chatData?.chatId) return;

    const unsubscribe = subscribeToMessages(chatData.chatId, () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', chatData.chatId] });
      if (user?.id) {
        markMessagesAsRead(chatData.chatId, user.id)
          .then(refreshUnreadCaches)
          .catch(() => {});
      }
    });

    return () => {
      unsubscribe();
    };
  }, [chatData?.chatId, user?.id, queryClient]);

  const recipientName = atletaProfile
    ? `${atletaProfile.first_name || ''} ${atletaProfile.last_name || ''}`.trim() || atletaProfile.email || 'Atleta'
    : 'Atleta';

  return (
    <div className="h-full min-h-0 bg-app-background">
      <ChatMessages
        recipientName={recipientName}
        recipientAvatar={atletaProfile?.avatar_url}
        messages={messages || []}
        currentUserId={user?.id || ''}
        onBack={() => navigate('/pt/app/chat')}
        onSend={(content, file) => sendMutation.mutateAsync({ content, file })}
        isLoading={chatLoading || messagesLoading}
        showPinnedButton={true}
      />
    </div>
  );
}

export default PTAppChatDetailPage;
