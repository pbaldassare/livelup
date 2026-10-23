import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { ChatMessages } from '@/components/app/ChatMessages';
import {
  getChatGroup,
  getChatGroupMembers,
  getChatGroupMessages,
  sendChatGroupMessage,
  subscribeToChatGroupMessages,
  markChatGroupRead,
} from '@/lib/api/chatGroups';
import { uploadChatAttachment, groupConversationKey } from '@/lib/api/chatAttachments';
import { toChatBubbles, setMessagePinned, toggleMessageReaction, subscribeToMessageReactions } from '@/lib/api/messages';
import { toast } from 'sonner';

// =====================================================
// ATLETA CHAT GROUP DETAIL PAGE - Chat di gruppo creata dal Coach
// =====================================================

export function AtletaChatGroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['chat-group', groupId],
    queryFn: () => getChatGroup(groupId!),
    enabled: !!groupId,
  });

  const { data: members } = useQuery({
    queryKey: ['chat-group-members', groupId],
    queryFn: () => getChatGroupMembers(groupId!),
    enabled: !!groupId,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['chat-group-messages', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      return toChatBubbles(await getChatGroupMessages(groupId), user!.id);
    },
    enabled: !!groupId && !!user?.id,
  });

  const sendMutation = useMutation({
    mutationFn: async ({ content, file, replyToId }: { content: string; file?: File | null; replyToId?: string }) => {
      if (!groupId || !user?.id) throw new Error('Gruppo non trovato');
      let attachmentUrl: string | undefined;
      let attachmentType: string | undefined;
      if (file) {
        const uploaded = await uploadChatAttachment(file, user.id, groupConversationKey(groupId));
        attachmentUrl = uploaded.url;
        attachmentType = uploaded.type;
      }
      return sendChatGroupMessage({ groupId, senderUserId: user.id, content, attachmentUrl, attachmentType, replyToId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-group-messages', groupId] });
      queryClient.invalidateQueries({ queryKey: ['atleta-chat-groups'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  useEffect(() => {
    if (groupId && user?.id) {
      markChatGroupRead(groupId, user.id).catch(() => {});
    }
  }, [groupId, user?.id]);

  useEffect(() => {
    if (!groupId) return;
    const unsubscribe = subscribeToChatGroupMessages(groupId, () => {
      queryClient.invalidateQueries({ queryKey: ['chat-group-messages', groupId] });
      if (user?.id) markChatGroupRead(groupId, user.id).catch(() => {});
    });
    const unsubReactions = subscribeToMessageReactions(`group:${groupId}`, () => {
      queryClient.invalidateQueries({ queryKey: ['chat-group-messages', groupId] });
    });
    return () => {
      unsubscribe();
      unsubReactions();
    };
  }, [groupId, user?.id, queryClient]);

  const membersCount = members?.length ?? 0;

  return (
    <div className="h-full min-h-0 bg-app-background">
      <ChatMessages
        recipientName={group?.name || 'Gruppo'}
        recipientAvatar={group?.avatar_url}
        subtitle={membersCount > 0 ? `${membersCount + 1} membri` : undefined}
        messages={messages || []}
        currentUserId={user?.id || ''}
        onBack={() => navigate('/app/chat')}
        onSend={(content, file, replyToId) => sendMutation.mutateAsync({ content, file, replyToId })}
        isLoading={groupLoading || messagesLoading}
        onPin={(id, pinned) => {
          setMessagePinned(id, pinned)
            .then(() => queryClient.invalidateQueries({ queryKey: ['chat-group-messages', groupId] }))
            .catch((e: Error) => toast.error(e.message));
        }}
        onReact={(id, emoji) => {
          if (!user?.id) return;
          toggleMessageReaction(id, user.id, emoji)
            .then(() => queryClient.invalidateQueries({ queryKey: ['chat-group-messages', groupId] }))
            .catch((e: Error) => toast.error(e.message));
        }}
      />
    </div>
  );
}

export default AtletaChatGroupDetailPage;
