import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  getGroupMessages,
  isAnnouncementEventAttachment,
  listGroupAnnouncements,
  sendGroupMessage,
  subscribeToGroupMessages,
  toggleGroupMessageLike,
  uploadGroupChatAttachment,
  GROUP_CHAT_ATTACHMENT_MAX_BYTES,
} from '@/lib/api/groups';
import type { GroupChannel, GroupMemberRole, GroupMessageRow } from '@/types/groups';
import { AnnouncementChatCard } from '@/components/groups/AnnouncementChatCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Heart, Paperclip, Play, Send, MessageCircle, Shield, X, Youtube } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  extractPrimaryYouTubeUrl,
  getYouTubeEmbedUrl,
  getYouTubeThumbnail,
  getYouTubeVideoId,
  isYouTubeAttachmentType,
  isYouTubeUrl,
  YOUTUBE_ATTACHMENT_TYPE,
} from '@/lib/youtube';

function isAdminRole(role?: GroupMemberRole | null) {
  return role === 'owner' || role === 'admin';
}

const CHANNEL_HINTS: Record<GroupChannel, string> = {
  general: 'Chat aperta a tutti i membri del gruppo.',
  announcements: 'Annunci dello staff verso tutti i membri.',
  admins: 'Canale privato tra amministratori del gruppo.',
};

function resolveYouTubeId(msg: GroupMessageRow): string | null {
  if (msg.attachment_url && (isYouTubeAttachmentType(msg.attachment_type) || isYouTubeUrl(msg.attachment_url))) {
    return getYouTubeVideoId(msg.attachment_url);
  }
  if (msg.attachment_url && getYouTubeVideoId(msg.attachment_url)) {
    return getYouTubeVideoId(msg.attachment_url);
  }
  if (msg.content) {
    const primary = extractPrimaryYouTubeUrl(msg.content);
    if (primary) return getYouTubeVideoId(primary);
    return getYouTubeVideoId(msg.content);
  }
  return null;
}

function YouTubeChatPreview({ url }: { url: string }) {
  const videoId = getYouTubeVideoId(url);
  const [playing, setPlaying] = useState(false);
  if (!videoId) return null;

  if (playing) {
    return (
      <div className="aspect-video w-full max-w-sm overflow-hidden rounded-lg bg-black">
        <iframe
          title="YouTube"
          src={getYouTubeEmbedUrl(videoId, { autoplay: true, mute: false, controls: true })}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="relative block w-full max-w-sm overflow-hidden rounded-lg bg-black text-left"
    >
      <img
        src={getYouTubeThumbnail(videoId)}
        alt="Anteprima YouTube"
        className="aspect-video w-full object-cover"
      />
      <span className="absolute inset-0 flex items-center justify-center bg-black/35">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-white shadow">
          <Play className="h-5 w-5 fill-current ml-0.5" />
        </span>
      </span>
    </button>
  );
}

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
  const [pendingYoutubeUrl, setPendingYoutubeUrl] = useState<string | null>(null);
  const [youtubeDraft, setYoutubeDraft] = useState('');
  const [youtubeOpen, setYoutubeOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['group-messages', groupId, channel, userId],
    queryFn: () => getGroupMessages(groupId, channel, userId),
    enabled: !!groupId,
  });

  const hasAnnouncementCards = messages.some((m) =>
    isAnnouncementEventAttachment(m.attachment_type),
  );
  const { data: announcements = [] } = useQuery({
    queryKey: ['group-announcements', groupId, userId],
    queryFn: () => listGroupAnnouncements(groupId, userId),
    enabled: !!groupId && hasAnnouncementCards,
  });
  const announcementMap = new Map(announcements.map((a) => [a.id, a]));

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
      let content = input;

      if (pendingYoutubeUrl) {
        attachmentUrl = pendingYoutubeUrl;
        attachmentType = YOUTUBE_ATTACHMENT_TYPE;
      } else if (pendingFile) {
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

      // Auto-detect: messaggio che è solo un link YouTube
      if (!attachmentUrl) {
        const yt = extractPrimaryYouTubeUrl(input);
        if (yt) {
          attachmentUrl = yt;
          attachmentType = YOUTUBE_ATTACHMENT_TYPE;
          content = '';
        }
      }

      return sendGroupMessage({
        groupId,
        senderUserId: userId,
        channel,
        content,
        attachmentUrl,
        attachmentType,
      });
    },
    onSuccess: () => {
      setInput('');
      setPendingFile(null);
      setPendingYoutubeUrl(null);
      setYoutubeDraft('');
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
    if (!input.trim() && !pendingFile && !pendingYoutubeUrl) return;
    sendMutation.mutate();
  };

  const onPickFile = (file?: File | null) => {
    if (!file) return;
    if (file.size > GROUP_CHAT_ATTACHMENT_MAX_BYTES) {
      toast.error('File troppo grande (max 40 MB)');
      return;
    }
    setPendingYoutubeUrl(null);
    setPendingFile(file);
  };

  const confirmYoutubeLink = () => {
    const raw = youtubeDraft.trim();
    if (!raw || !isYouTubeUrl(raw)) {
      toast.error('Inserisci un link YouTube valido');
      return;
    }
    setPendingFile(null);
    if (fileRef.current) fileRef.current.value = '';
    setPendingYoutubeUrl(raw);
    setYoutubeOpen(false);
  };

  const busy = sendMutation.isPending || uploading;
  const canSend = !!input.trim() || !!pendingFile || !!pendingYoutubeUrl;

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
          const isAnnouncement =
            isAnnouncementEventAttachment(msg.attachment_type) && !!msg.attachment_url;
          const youtubeId = isAnnouncement ? null : resolveYouTubeId(msg);
          const youtubeSrc =
            (msg.attachment_url && getYouTubeVideoId(msg.attachment_url)
              ? msg.attachment_url
              : null) ||
            extractPrimaryYouTubeUrl(msg.content || '') ||
            (youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : null);
          const isYouTube = !isAnnouncement && !!youtubeId && !!youtubeSrc;
          const isImage =
            !isAnnouncement &&
            !isYouTube &&
            !!msg.attachment_type?.startsWith('image/') &&
            !!msg.attachment_url;
          const isVideo =
            !isAnnouncement &&
            !isYouTube &&
            !!msg.attachment_type?.startsWith('video/') &&
            !!msg.attachment_url;
          const contentIsPureYoutube =
            !!msg.content && !!extractPrimaryYouTubeUrl(msg.content);
          const isPlaceholderContent =
            !!msg.content &&
            (msg.content.startsWith('📷') ||
              msg.content.startsWith('🎬') ||
              msg.content.startsWith('📎'));
          const showText =
            !isAnnouncement &&
            !!msg.content &&
            !contentIsPureYoutube &&
            !(isPlaceholderContent && (!!msg.attachment_url || isYouTube));

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
              <div className={cn('space-y-1', isAnnouncement ? 'max-w-[85%]' : 'max-w-[75%]')}>
                {isAnnouncement ? (
                  <div className="space-y-1">
                    {!isMine && (
                      <p className="text-[10px] font-semibold text-app-muted-foreground px-1">
                        {name}
                      </p>
                    )}
                    <AnnouncementChatCard
                      announcementId={msg.attachment_url!}
                      groupId={groupId}
                      userId={userId}
                      announcement={announcementMap.get(msg.attachment_url!) ?? null}
                      compact
                    />
                    <p className="text-[10px] text-app-muted-foreground px-1">
                      {format(new Date(msg.created_at), 'HH:mm', { locale: it })}
                    </p>
                  </div>
                ) : (
                  <>
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
                      {isYouTube && youtubeSrc && <YouTubeChatPreview url={youtubeSrc} />}
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
                      {msg.attachment_url && !isImage && !isVideo && !isYouTube && (
                        <a
                          href={msg.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs underline break-all"
                        >
                          Apri allegato
                        </a>
                      )}
                      {showText ? (
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
                  </>
                )}
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
          {pendingYoutubeUrl && (
            <div className="flex items-center gap-2 text-xs text-app-muted-foreground bg-app-muted/50 rounded-lg px-2 py-1.5">
              <Youtube className="h-3.5 w-3.5 shrink-0 text-red-500" />
              <span className="truncate flex-1">{pendingYoutubeUrl}</span>
              <button
                type="button"
                onClick={() => setPendingYoutubeUrl(null)}
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
              title="Allega file (max 40 MB)"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Popover open={youtubeOpen} onOpenChange={setYoutubeOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="shrink-0 border-app-border"
                  disabled={busy}
                  title="Link YouTube"
                >
                  <Youtube className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3 space-y-2" align="start">
                <p className="text-sm font-medium">Link YouTube</p>
                <Input
                  value={youtubeDraft}
                  onChange={(e) => setYoutubeDraft(e.target.value)}
                  placeholder="Incolla link YouTube…"
                  className="bg-app-background border-app-border"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      confirmYoutubeLink();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  className="w-full bg-app-accent text-black"
                  onClick={confirmYoutubeLink}
                >
                  Allega video
                </Button>
              </PopoverContent>
            </Popover>
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
              disabled={busy || !canSend}
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
