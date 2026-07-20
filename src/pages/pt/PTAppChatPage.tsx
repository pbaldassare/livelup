import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  MessageSquare,
  Search,
  ChevronRight,
  Circle,
  Users,
  CheckSquare,
  X,
  Paperclip,
  Send,
  Loader2,
  Plus,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getOrCreateChat, sendMessage } from '@/lib/api/messages';
import { getPTChatGroups } from '@/lib/api/chatGroups';
import { uploadChatAttachment, validateChatAttachment } from '@/lib/api/chatAttachments';
import { CreateChatGroupDialog } from '@/components/pt/CreateChatGroupDialog';
import { toast } from 'sonner';

// =====================================================
// PT APP CHAT PAGE - Lista conversazioni (Mobile)
// Mostra SEMPRE tutti gli atleti collegati al PT, anche senza messaggi.
// Supporta: invio multiplo (broadcast) selezionando più atleti, e gruppi chat.
// =====================================================

interface AthleteChatRow {
  atleta_user_id: string;
  chat_id: string | null;
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  lastMessage: { content: string | null; sender_user_id: string; created_at: string } | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export function PTAppChatPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  const { data: rows, isLoading } = useQuery({
    queryKey: ['pt-chats-with-athletes', user?.id],
    queryFn: async (): Promise<AthleteChatRow[]> => {
      if (!user?.id) return [];

      // 1) Tutti gli atleti collegati attivi
      const { data: connections, error: connErr } = await supabase
        .from('pt_atleta_connections')
        .select('atleta_user_id')
        .eq('pt_user_id', user.id)
        .eq('status', 'active');

      if (connErr) throw connErr;

      const athleteIds = (connections || []).map((c) => c.atleta_user_id);
      if (athleteIds.length === 0) return [];

      // 2) Chats esistenti per questi atleti
      const { data: chatsData } = await supabase
        .from('chats')
        .select('id, atleta_user_id, last_message_at, is_active')
        .eq('pt_user_id', user.id)
        .in('atleta_user_id', athleteIds);

      const chatByAthlete = new Map<string, { id: string; last_message_at: string | null }>();
      (chatsData || []).forEach((c) => {
        chatByAthlete.set(c.atleta_user_id, { id: c.id, last_message_at: c.last_message_at });
      });

      // 3) Profili
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, avatar_url')
        .in('user_id', athleteIds);

      const profileByUser = new Map<string, AthleteChatRow['profile']>();
      (profiles || []).forEach((p) => {
        profileByUser.set(p.user_id, {
          first_name: p.first_name,
          last_name: p.last_name,
          email: p.email,
          avatar_url: p.avatar_url,
        });
      });

      // 4) Per ogni chat: ultimo messaggio + unread count
      const enriched = await Promise.all(
        athleteIds.map(async (athleteId) => {
          const chat = chatByAthlete.get(athleteId) || null;

          let lastMessage: AthleteChatRow['lastMessage'] = null;
          let unreadCount = 0;

          if (chat) {
            const { data: lastMsg } = await supabase
              .from('messages')
              .select('content, sender_user_id, created_at')
              .eq('chat_id', chat.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            lastMessage = lastMsg || null;

            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('chat_id', chat.id)
              .neq('sender_user_id', user.id)
              .eq('is_read', false);

            unreadCount = count || 0;
          }

          return {
            atleta_user_id: athleteId,
            chat_id: chat?.id || null,
            profile: profileByUser.get(athleteId) || null,
            lastMessage,
            lastMessageAt: chat?.last_message_at || null,
            unreadCount,
          } as AthleteChatRow;
        })
      );

      // 5) Ordinamento: chat con messaggi (per data desc) → poi atleti senza messaggi (alfabetico)
      enriched.sort((a, b) => {
        const aHas = !!a.lastMessage;
        const bHas = !!b.lastMessage;
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;
        if (aHas && bHas) {
          return (
            new Date(b.lastMessage!.created_at).getTime() -
            new Date(a.lastMessage!.created_at).getTime()
          );
        }
        const aName = `${a.profile?.first_name || ''} ${a.profile?.last_name || ''}`.trim();
        const bName = `${b.profile?.first_name || ''} ${b.profile?.last_name || ''}`.trim();
        return aName.localeCompare(bName);
      });

      return enriched;
    },
    enabled: !!user?.id,
  });

  const { data: chatGroups, isLoading: groupsLoading } = useQuery({
    queryKey: ['pt-chat-groups', user?.id],
    queryFn: () => getPTChatGroups(user!.id),
    enabled: !!user?.id,
  });

  const filteredRows = rows?.filter((r) => {
    if (!searchQuery) return true;
    const name = `${r.profile?.first_name || ''} ${r.profile?.last_name || ''}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const totalUnread = rows?.reduce((sum, r) => sum + r.unreadCount, 0) || 0;
  const totalGroupUnread = chatGroups?.reduce((sum, g) => sum + g.unread_count, 0) || 0;

  const toggleSelectMode = () => {
    setSelectMode((v) => !v);
    setSelectedIds(new Set());
  };

  const toggleSelected = (athleteId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(athleteId)) next.delete(athleteId);
      else next.add(athleteId);
      return next;
    });
  };

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Chat</h1>
          <div className="flex items-center gap-2">
            {totalUnread + totalGroupUnread > 0 && (
              <Badge variant="default">{totalUnread + totalGroupUnread} non letti</Badge>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca atleta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs defaultValue="atleti" className="w-full">
        <div className="px-4 pt-3">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="atleti">Atleti</TabsTrigger>
            <TabsTrigger value="gruppi" className="gap-1.5">
              Gruppi
              {totalGroupUnread > 0 && (
                <Badge variant="default" className="h-4 px-1 text-[10px]">
                  {totalGroupUnread}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* === TAB ATLETI === */}
        <TabsContent value="atleti" className="mt-0">
          <div className="px-4 pt-3">
            <Button
              variant={selectMode ? 'secondary' : 'outline'}
              size="sm"
              className="w-full"
              onClick={toggleSelectMode}
            >
              {selectMode ? (
                <>
                  <X className="h-4 w-4 mr-1.5" />
                  Annulla selezione
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4 mr-1.5" />
                  Seleziona per inviare a più atleti
                </>
              )}
            </Button>
          </div>

          <div className="p-4 space-y-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))
            ) : filteredRows && filteredRows.length > 0 ? (
              filteredRows.map((row) => (
                <ChatCard
                  key={row.atleta_user_id}
                  row={row}
                  currentUserId={user?.id || ''}
                  selectMode={selectMode}
                  selected={selectedIds.has(row.atleta_user_id)}
                  onToggleSelected={() => toggleSelected(row.atleta_user_id)}
                />
              ))
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Nessun atleta collegato</h3>
                  <p className="text-sm text-muted-foreground">
                    Quando avrai atleti collegati potrai chattare con loro qui
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* === TAB GRUPPI === */}
        <TabsContent value="gruppi" className="mt-0">
          <div className="px-4 pt-3">
            <Button size="sm" className="w-full" onClick={() => setCreateGroupOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Nuovo gruppo
            </Button>
          </div>

          <div className="p-4 space-y-2">
            {groupsLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : chatGroups && chatGroups.length > 0 ? (
              chatGroups.map((group) => (
                <Link key={group.id} to={`/pt/app/chat/group/${group.id}`}>
                  <Card className={cn('hover:bg-muted/50 transition-colors', group.unread_count > 0 && 'border-primary/30 bg-primary/5')}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={group.avatar_url || undefined} />
                            <AvatarFallback>
                              <Users className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                          {group.unread_count > 0 && (
                            <Circle className="absolute -top-1 -right-1 h-4 w-4 fill-primary text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className={cn('font-semibold truncate', group.unread_count > 0 && 'font-bold')}>
                              {group.name}
                            </h3>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            {group.last_message?.content ||
                              (group.last_message?.attachment_type ? 'Allegato' : `${group.members_count} atleti`)}
                          </p>
                          {group.unread_count > 0 && (
                            <Badge variant="default" className="mt-1 text-xs">
                              {group.unread_count} {group.unread_count === 1 ? 'nuovo' : 'nuovi'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Nessun gruppo creato</h3>
                  <p className="text-sm text-muted-foreground">
                    Crea un gruppo per chattare con più atleti insieme
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {selectMode && selectedIds.size > 0 && (
        <BroadcastComposer
          ptUserId={user?.id || ''}
          selectedCount={selectedIds.size}
          onSend={async (content, file) => {
            if (!user?.id) return;
            let attachmentUrl: string | undefined;
            let attachmentType: string | undefined;
            if (file) {
              const uploaded = await uploadChatAttachment(file, user.id, `broadcast-${Date.now()}`);
              attachmentUrl = uploaded.url;
              attachmentType = uploaded.type;
            }
            let sent = 0;
            for (const athleteId of selectedIds) {
              const chat = await getOrCreateChat(user.id, athleteId);
              await sendMessage({
                chatId: chat.id,
                senderUserId: user.id,
                content,
                attachmentUrl,
                attachmentType,
              });
              sent++;
            }
            toast.success(`Messaggio inviato a ${sent} ${sent === 1 ? 'atleta' : 'atleti'}`);
            setSelectMode(false);
            setSelectedIds(new Set());
            queryClient.invalidateQueries({ queryKey: ['pt-chats-with-athletes'] });
          }}
        />
      )}

      <CreateChatGroupDialog
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
        ptUserId={user?.id || ''}
        athletes={(rows || []).map((r) => ({ atleta_user_id: r.atleta_user_id, profile: r.profile }))}
        detailBasePath="/pt/app/chat/group"
      />
    </div>
  );
}

function ChatCard({
  row,
  currentUserId,
  selectMode,
  selected,
  onToggleSelected,
}: {
  row: AthleteChatRow;
  currentUserId: string;
  selectMode: boolean;
  selected: boolean;
  onToggleSelected: () => void;
}) {
  const name = `${row.profile?.first_name || ''} ${row.profile?.last_name || ''}`.trim() || row.profile?.email || 'Atleta';
  const initials = `${row.profile?.first_name?.[0] || ''}${row.profile?.last_name?.[0] || ''}`;
  const hasUnread = row.unreadCount > 0;

  const isOwnMessage = row.lastMessage?.sender_user_id === currentUserId;
  const messagePreview = row.lastMessage?.content
    ? (isOwnMessage ? 'Tu: ' : '') + row.lastMessage.content
    : 'Nessuna conversazione';

  const timeAgo = row.lastMessage?.created_at
    ? formatDistanceToNow(new Date(row.lastMessage.created_at), { addSuffix: true, locale: it })
    : null;

  const cardContent = (
    <Card
      className={cn(
        'hover:bg-muted/50 transition-colors',
        hasUnread && 'border-primary/30 bg-primary/5',
        selected && 'border-primary bg-primary/10',
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {selectMode && (
            <Checkbox checked={selected} onCheckedChange={onToggleSelected} className="shrink-0" />
          )}
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarImage src={row.profile?.avatar_url || undefined} />
              <AvatarFallback>{initials || 'A'}</AvatarFallback>
            </Avatar>
            {hasUnread && (
              <Circle className="absolute -top-1 -right-1 h-4 w-4 fill-primary text-primary" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className={cn('font-semibold truncate', hasUnread && 'font-bold')}>{name}</h3>
              <div className="flex items-center gap-2">
                {timeAgo && (
                  <span className="text-xs text-muted-foreground">{timeAgo}</span>
                )}
                {!selectMode && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>

            <p
              className={cn(
                'text-sm truncate mt-0.5',
                hasUnread
                  ? 'text-foreground font-medium'
                  : row.lastMessage
                  ? 'text-muted-foreground'
                  : 'text-muted-foreground italic'
              )}
            >
              {messagePreview}
            </p>

            {hasUnread && (
              <Badge variant="default" className="mt-1 text-xs">
                {row.unreadCount} {row.unreadCount === 1 ? 'nuovo' : 'nuovi'}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (selectMode) {
    return <button type="button" className="w-full text-left" onClick={onToggleSelected}>{cardContent}</button>;
  }

  return <Link to={`/pt/app/chat/${row.atleta_user_id}`}>{cardContent}</Link>;
}

function BroadcastComposer({
  selectedCount,
  onSend,
}: {
  ptUserId: string;
  selectedCount: number;
  onSend: (content: string, file: File | null) => Promise<void>;
}) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const error = validateChatAttachment(f);
    if (error) {
      toast.error(error);
      e.target.value = '';
      return;
    }
    setFile(f);
  };

  const handleSend = async () => {
    if (!text.trim() && !file) return;
    setIsSending(true);
    try {
      await onSend(text.trim(), file);
      setText('');
      setFile(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Errore durante l\'invio');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border p-3 space-y-2 max-w-md mx-auto">
      <p className="text-xs text-muted-foreground font-medium">
        Invio a {selectedCount} {selectedCount === 1 ? 'atleta selezionato' : 'atleti selezionati'}
      </p>
      {file && (
        <div className="flex items-center gap-2 bg-muted rounded-lg p-2">
          <span className="flex-1 text-xs truncate">{file.name}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFile(null)} disabled={isSending}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Input
          placeholder="Scrivi un messaggio per tutti..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isSending}
          className="flex-1"
        />
        <Button size="icon" onClick={handleSend} disabled={isSending || (!text.trim() && !file)}>
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export default PTAppChatPage;
