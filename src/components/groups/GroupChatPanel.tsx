import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  getGroupMessages,
  sendGroupMessage,
  subscribeToGroupMessages,
} from '@/lib/api/groups';
import type { GroupChannel, GroupMemberRole } from '@/types/groups';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Megaphone, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface GroupChatPanelProps {
  groupId: string;
  userId: string;
  myRole?: GroupMemberRole | null;
}

function isAdminRole(role?: GroupMemberRole | null) {
  return role === 'owner' || role === 'admin';
}

function ChannelThread({
  groupId,
  userId,
  channel,
  canPost,
}: {
  groupId: string;
  userId: string;
  channel: GroupChannel;
  canPost: boolean;
}) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['group-messages', groupId, channel],
    queryFn: () => getGroupMessages(groupId, channel),
    enabled: !!groupId,
  });

  const senderIds = [...new Set(messages.map((m) => m.sender_user_id))];
  const { data: profiles = [] } = useQuery({
    queryKey: ['group-message-profiles', senderIds.join(',')],
    queryFn: async () => {
      if (senderIds.length === 0) return [];
      const { data } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, avatar_url')
        .in('user_id', senderIds);
      return data || [];
    },
    enabled: senderIds.length > 0,
  });

  const profileMap = new Map(profiles.map((p) => [p.user_id, p]));

  useEffect(() => {
    const unsub = subscribeToGroupMessages(groupId, channel, () => {
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId, channel] });
    });
    return unsub;
  }, [groupId, channel, queryClient]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      sendGroupMessage({ groupId, senderUserId: userId, channel, content }),
    onSuccess: () => {
      setInput('');
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId, channel] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSend = () => {
    if (!input.trim() || !canPost) return;
    sendMutation.mutate(input.trim());
  };

  return (
    <div className="flex flex-col h-[min(60vh,480px)]">
      <div className="flex-1 overflow-y-auto space-y-3 p-2">
        {isLoading && (
          <p className="text-sm text-app-muted-foreground text-center py-8">
            Caricamento messaggi...
          </p>
        )}
        {!isLoading && messages.length === 0 && (
          <p className="text-sm text-app-muted-foreground text-center py-8">
            {channel === 'announcements'
              ? 'Nessun annuncio ancora'
              : 'Inizia la conversazione'}
          </p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_user_id === userId;
          const profile = profileMap.get(msg.sender_user_id);
          const name =
            [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Utente';
          const initials = name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2);

          return (
            <div
              key={msg.id}
              className={cn('flex gap-2', isMine && 'flex-row-reverse')}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className={cn('max-w-[75%] space-y-0.5', isMine && 'items-end')}>
                <div className={cn('flex items-center gap-2', isMine && 'flex-row-reverse')}>
                  <span className="text-xs font-medium text-app-foreground">{name}</span>
                  <span className="text-[10px] text-app-muted-foreground">
                    {format(new Date(msg.created_at), 'HH:mm', { locale: it })}
                  </span>
                </div>
                <div
                  className={cn(
                    'rounded-2xl px-3 py-2 text-sm',
                    isMine
                      ? 'bg-app-accent text-black rounded-tr-sm'
                      : 'bg-app-muted text-app-foreground rounded-tl-sm',
                  )}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {canPost ? (
        <div className="flex gap-2 p-2 border-t border-app-border">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              channel === 'announcements' ? 'Scrivi un annuncio...' : 'Scrivi un messaggio...'
            }
            className="bg-app-muted border-app-border text-app-foreground placeholder:text-app-muted-foreground"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || sendMutation.isPending}
            className="bg-app-accent text-black shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <p className="text-xs text-app-muted-foreground text-center py-3 border-t border-app-border">
          Solo gli amministratori possono pubblicare annunci
        </p>
      )}
    </div>
  );
}

export function GroupChatPanel({ groupId, userId, myRole }: GroupChatPanelProps) {
  const admin = isAdminRole(myRole);

  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="w-full grid grid-cols-2 bg-app-muted border border-app-border p-1">
        <TabsTrigger
          value="general"
          className="gap-1 data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground"
        >
          <MessageCircle className="h-4 w-4" />
          Generale
        </TabsTrigger>
        <TabsTrigger
          value="announcements"
          className="gap-1 data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground"
        >
          <Megaphone className="h-4 w-4" />
          Annunci
          {admin && (
            <Badge variant="outline" className="text-[9px] ml-1 px-1">
              Admin
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="general">
        <ChannelThread groupId={groupId} userId={userId} channel="general" canPost />
      </TabsContent>
      <TabsContent value="announcements">
        <ChannelThread
          groupId={groupId}
          userId={userId}
          channel="announcements"
          canPost={admin}
        />
      </TabsContent>
    </Tabs>
  );
}
