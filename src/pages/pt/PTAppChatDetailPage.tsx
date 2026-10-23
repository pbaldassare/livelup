import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessages } from '@/components/app/ChatMessages';
import {
  getOrCreateChat,
  getChatMessages,
  sendMessage,
  markMessagesAsRead,
  subscribeToMessages,
  subscribeToMessageReactions,
  toChatBubbles,
  setMessagePinned,
  toggleMessageReaction,
} from '@/lib/api/messages';
import { useChatTyping } from '@/hooks/useChatTyping';
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
  const { isPeerTyping, setTyping } = useChatTyping(chatData?.chatId, user?.id);

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

      return toChatBubbles(await getChatMessages(chatData.chatId), user!.id);
    },
    enabled: !!chatData?.chatId && !!user?.id,
  });

  // Send message mutation (testo e/o allegato immagine/video)
  const sendMutation = useMutation({
    mutationFn: async ({ content, file, replyToId }: { content: string; file?: File | null; replyToId?: string }) => {
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
        replyToId,
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
    const unsubReactions = subscribeToMessageReactions(chatData.chatId, () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', chatData.chatId] });
    });

    return () => {
      unsubscribe();
      unsubReactions();
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
        onSend={(content, file, replyToId) => sendMutation.mutateAsync({ content, file, replyToId })}
        isLoading={chatLoading || messagesLoading}
        showPinnedButton={true}
        isPeerTyping={isPeerTyping}
        onTypingChange={setTyping}
        onPin={(id, pinned) => {
          setMessagePinned(id, pinned)
            .then(() => queryClient.invalidateQueries({ queryKey: ['chat-messages', chatData?.chatId] }))
            .catch((e: Error) => toast.error(e.message));
        }}
        onReact={(id, emoji) => {
          if (!user?.id) return;
          toggleMessageReaction(id, user.id, emoji)
            .then(() => queryClient.invalidateQueries({ queryKey: ['chat-messages', chatData?.chatId] }))
            .catch((e: Error) => toast.error(e.message));
        }}
      />
    </div>
  );
}

export default PTAppChatDetailPage;
