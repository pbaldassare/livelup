import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessages } from '@/components/app/ChatMessages';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import {
  getChatGroup,
  getChatGroupMembers,
  getChatGroupMessages,
  sendChatGroupMessage,
  subscribeToChatGroupMessages,
  markChatGroupRead,
} from '@/lib/api/chatGroups';
import { uploadChatAttachment, groupConversationKey } from '@/lib/api/chatAttachments';
import { ManageChatGroupSheet } from '@/components/pt/ManageChatGroupSheet';
import { toast } from 'sonner';

// =====================================================
// PT APP CHAT GROUP DETAIL PAGE - Chat di gruppo (PT + atleti selezionati)
// =====================================================

export function PTAppChatGroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [manageOpen, setManageOpen] = useState(false);

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

  const { data: connectedAthletes = [] } = useQuery({
    queryKey: ['connected-athletes-basic', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: connections } = await supabase
        .from('pt_atleta_connections')
        .select('atleta_user_id')
        .eq('pt_user_id', user.id)
        .eq('status', 'active');
      const athleteIds = (connections || []).map((c) => c.atleta_user_id);
      if (athleteIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, avatar_url')
        .in('user_id', athleteIds);
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      return athleteIds.map((id) => ({
        atleta_user_id: id,
        profile: profileMap.get(id) || null,
      }));
    },
    enabled: !!user?.id && manageOpen,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['chat-group-messages', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const messagesData = await getChatGroupMessages(groupId);

      const senderIds = [...new Set(messagesData.map((m) => m.sender_user_id))];
      const { data: profiles } = senderIds.length
        ? await supabase.from('profiles').select('user_id, first_name, last_name, avatar_url').in('user_id', senderIds)
        : { data: [] };
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      return messagesData.map((msg) => {
        const profile = profileMap.get(msg.sender_user_id);
        return {
          id: msg.id,
          content: msg.content || '',
          senderUserId: msg.sender_user_id,
          senderName: profile
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Atleta'
            : 'Atleta',
          senderAvatar: profile?.avatar_url,
          createdAt: msg.created_at,
          isRead: true,
          attachmentUrl: msg.attachment_url,
          attachmentType: msg.attachment_type,
        };
      });
    },
    enabled: !!groupId,
  });

  const sendMutation = useMutation({
    mutationFn: async ({ content, file }: { content: string; file?: File | null }) => {
      if (!groupId || !user?.id) throw new Error('Gruppo non trovato');
      let attachmentUrl: string | undefined;
      let attachmentType: string | undefined;
      if (file) {
        const uploaded = await uploadChatAttachment(file, user.id, groupConversationKey(groupId));
        attachmentUrl = uploaded.url;
        attachmentType = uploaded.type;
      }
      return sendChatGroupMessage({ groupId, senderUserId: user.id, content, attachmentUrl, attachmentType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-group-messages', groupId] });
      queryClient.invalidateQueries({ queryKey: ['pt-chat-groups'] });
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
    return unsubscribe;
  }, [groupId, user?.id, queryClient]);

  const membersCount = members?.length ?? 0;

  return (
    <div className="h-full min-h-0 bg-app-background">
      <ChatMessages
        recipientName={group?.name || 'Gruppo'}
        recipientAvatar={group?.avatar_url}
        subtitle={`${membersCount} ${membersCount === 1 ? 'atleta' : 'atleti'}`}
        messages={messages || []}
        currentUserId={user?.id || ''}
        onBack={() => navigate('/pt/app/chat')}
        onSend={(content, file) => sendMutation.mutateAsync({ content, file })}
        isLoading={groupLoading || messagesLoading}
        headerAction={
          <Button
            variant="ghost"
            size="icon"
            className="text-app-muted-foreground hover:bg-app-muted"
            onClick={() => setManageOpen(true)}
          >
            <Settings className="h-5 w-5" />
          </Button>
        }
      />

      {groupId && group && (
        <ManageChatGroupSheet
          open={manageOpen}
          onOpenChange={setManageOpen}
          groupId={groupId}
          groupName={group.name}
          connectedAthletes={connectedAthletes}
          chatListPath="/pt/app/chat"
        />
      )}
    </div>
  );
}

export default PTAppChatGroupDetailPage;
