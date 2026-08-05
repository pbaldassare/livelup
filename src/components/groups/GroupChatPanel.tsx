import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  getGroupMessages,
  sendGroupMessage,
  subscribeToGroupMessages,
  toggleGroupMessageLike,
  uploadGroupChatAttachment,
  GROUP_CHAT_ATTACHMENT_MAX_BYTES,
} from '@/lib/api/groups';
import type { GroupChannel, GroupMemberRole, GroupMessageRow } from '@/types/groups';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Paperclip, Send, MessageCircle, Shield, X } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function isAdminRole(role?: GroupMemberRole | null) {
  return role === 'owner' || role === 'admin';
}

const CHANNEL_HINTS: Record<GroupChannel, string> = {
  general: 'Chat aperta a tutti i membri del gruppo.',
  announcements: 'Annunci dello staff verso tutti i membri.',
  admins: 'Canale privato tra amministratori del gruppo.',
};

export function GroupChannelPanel({
  groupId,
  userId,
  channel,
  myRole,
}: {
  groupId: string;
  userId: string;
  channel: GroupChannel;
  myRole?: GroupMemberRole | null;
}) {
  const admin = isAdminRole(myRole);
  const canPost = channel === 'announcements' ? admin : true;

  return (
    <ChannelThread
      groupId={groupId}
      userId={userId}
      channel={channel}
      canPost={canPost}
      emptyHint={CHANNEL_HINTS[channel]}
    />
  );
}

/** Inbox PT: solo chat (annunci sono popup evento in scheda gruppo). */
export function GroupChatPanel({
  groupId,
  userId,
  myRole,
}: {
  groupId: string;
  userId: string;
  myRole?: GroupMemberRole | null;
}) {
  const admin = isAdminRole(myRole);
  const cols = admin ? 'grid-cols-2' : 'grid-cols-1';

  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className={cn('w-full grid bg-app-muted border border-app-border p-1', cols)}>
        <TabsTrigger
          value="general"
          className="gap-1 text-xs sm:text-sm data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground"
        >
          <MessageCircle className="h-4 w-4 shrink-0" />
          <span className="truncate">Chat Gruppo</span>
        </TabsTrigger>
        {admin && (
          <TabsTrigger
            value="admins"
            className="gap-1 text-xs sm:text-sm data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground"
          >
            <Shield className="h-4 w-4 shrink-0" />
            <span className="truncate">Chat Admin</span>
          </TabsTrigger>
        )}
      </TabsList>
      <TabsContent value="general">
        <GroupChannelPanel groupId={groupId} userId={userId} channel="general" myRole={myRole} />
      </TabsContent>
      {admin && (
        <TabsContent value="admins">
          <GroupChannelPanel groupId={groupId} userId={userId} channel="admins" myRole={myRole} />
        </TabsContent>
      )}
    </Tabs>
  );
}

function ChannelThread({
  groupId,
  userId,
  channel,
  canPost,
  emptyHint,
}: {
  groupId: string;
  userId: string;
  channel: GroupChannel;
  canPost: boolean;
  emptyHint?: string;
}) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['group-messages', groupId, channel, userId],
    queryFn: () => getGroupMessages(groupId, channel, userId),
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
    mutationFn: async () => {
      let attachmentUrl: string | null = null;
      let attachmentType: string | null = null;
      if (pendingFile) {
        setUploading(true);
        try {
          const up = await uploadGroupChatAttachment({
            userId,
            groupId,
            file: pendingFile,
          });
          attachmentUrl = up.publicUrl;
          attachmentType = up.mimeType;
        } finally {
          setUploading(false);
        }
      }
      return sendGroupMessage({
        groupId,
        senderUserId: userId,
        channel,
        content: input,
        attachmentUrl,
        attachmentType,
      });
    },
    onSuccess: () => {
      setInput('');
      setPendingFile(null);
      if (fileRef.current) fileRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId, channel] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const likeMutation = useMutation({
    mutationFn: (msg: GroupMessageRow) =>
      toggleGroupMessageLike({
        messageId: msg.id,
        userId,
        currentlyLiked: !!msg.liked_by_me,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId, channel] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSend = () => {
    if (!canPost) return;
    if (!input.trim() && !pendingFile) return;
    sendMutation.mutate();
  };

  const onPickFile = (file?: File | null) => {
    if (!file) return;
    if (file.size > GROUP_CHAT_ATTACHMENT_MAX_BYTES) {
      toast.error('File troppo grande (max 20 MB)');
      return;
    }
    setPendingFile(file);
  };

  const busy = sendMutation.isPending || uploading;

  return (
    <div className="flex flex-col h-[min(60vh,480px)]">
      <div className="flex-1 overflow-y-auto space-y-3 p-2">
        {isLoading && (
          <p className="text-sm text-app-muted-foreground text-center py-8">
            Caricamento messaggi…
          </p>
        )}
        {!isLoading && messages.length === 0 && (
          <p className="text-sm text-app-muted-foreground text-center py-8 px-4">
            {emptyHint || 'Nessun messaggio ancora. Scrivi il primo!'}
          </p>
        )}
        {messages.map((msg) => {
          const profile = profileMap.get(msg.sender_user_id);
          const name = profile
            ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Utente'
            : 'Utente';
          const isMine = msg.sender_user_id === userId;
          const isImage = !!msg.attachment_type?.startsWith('image/') && !!msg.attachment_url;
          const isVideo = !!msg.attachment_type?.startsWith('video/') && !!msg.attachment_url;
          return (
            <div
              key={msg.id}
              className={cn('flex gap-2', isMine ? 'flex-row-reverse' : 'flex-row')}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-app-muted">
                  {name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="max-w-[75%] space-y-1">
                <div
                  className={cn(
                    'rounded-2xl px-3 py-2 space-y-1.5',
                    isMine
                      ? 'bg-app-accent text-app-accent-foreground rounded-tr-sm'
                      : 'bg-app-muted text-app-foreground rounded-tl-sm',
                  )}
                >
                  {!isMine && (
                    <p className="text-[10px] font-semibold opacity-80">{name}</p>
                  )}
                  {isImage && (
                    <a href={msg.attachment_url!} target="_blank" rel="noopener noreferrer">
                      <img
                        src={msg.attachment_url!}
                        alt=""
                        className="max-h-48 w-full rounded-lg object-cover"
                      />
                    </a>
                  )}
                  {isVideo && (
                    <video
                      src={msg.attachment_url!}
                      controls
                      className="max-h-48 w-full rounded-lg bg-black"
                    />
                  )}
                  {msg.attachment_url && !isImage && !isVideo && (
                    <a
                      href={msg.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs underline break-all"
                    >
                      Apri allegato
                    </a>
                  )}
                  {msg.content && !msg.content.startsWith('📷') && !msg.content.startsWith('🎬') && !msg.content.startsWith('📎') ? (
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  ) : !msg.attachment_url ? (
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  ) : null}
                  <p
                    className={cn(
                      'text-[10px]',
                      isMine ? 'text-app-accent-foreground/70' : 'text-app-muted-foreground',
                    )}
                  >
                    {format(new Date(msg.created_at), 'HH:mm', { locale: it })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => likeMutation.mutate(msg)}
                  className={cn(
                    'inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full transition-colors',
                    msg.liked_by_me
                      ? 'text-red-500'
                      : 'text-app-muted-foreground hover:text-app-foreground',
                  )}
                >
                  <Heart
                    className={cn('h-3.5 w-3.5', msg.liked_by_me && 'fill-current')}
                  />
                  {(msg.likes_count ?? 0) > 0 ? msg.likes_count : ''}
                </button>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {canPost ? (
        <div className="border-t border-app-border p-2 space-y-2">
          {pendingFile && (
            <div className="flex items-center gap-2 text-xs text-app-muted-foreground bg-app-muted/50 rounded-lg px-2 py-1.5">
              <Paperclip className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate flex-1">{pendingFile.name}</span>
              <button
                type="button"
                onClick={() => {
                  setPendingFile(null);
                  if (fileRef.current) fileRef.current.value = '';
                }}
                className="p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*,.pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0])}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="shrink-0 border-app-border"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              title="Allega file (max 20 MB)"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Scrivi un messaggio..."
              className="bg-app-background border-app-border"
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
              disabled={busy || (!input.trim() && !pendingFile)}
              className="bg-app-accent text-black shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-app-muted-foreground text-center py-3 border-t border-app-border">
          Solo gli amministratori possono pubblicare qui
        </p>
      )}
    </div>
  );
}
