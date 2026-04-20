import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  MessageSquare,
  Search,
  ChevronRight,
  Circle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// =====================================================
// PT APP CHAT PAGE - Lista conversazioni (Mobile)
// Mostra SEMPRE tutti gli atleti collegati al PT, anche senza messaggi.
// =====================================================

interface AthleteChatRow {
  atleta_user_id: string;
  chat_id: string | null;
  profile: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
  lastMessage: { content: string | null; sender_user_id: string; created_at: string } | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export function PTAppChatPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

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
        .select('user_id, first_name, last_name, avatar_url')
        .in('user_id', athleteIds);

      const profileByUser = new Map<string, AthleteChatRow['profile']>();
      (profiles || []).forEach((p) => {
        profileByUser.set(p.user_id, {
          first_name: p.first_name,
          last_name: p.last_name,
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

  const filteredRows = rows?.filter((r) => {
    if (!searchQuery) return true;
    const name = `${r.profile?.first_name || ''} ${r.profile?.last_name || ''}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const totalUnread = rows?.reduce((sum, r) => sum + r.unreadCount, 0) || 0;

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Chat</h1>
          {totalUnread > 0 && (
            <Badge variant="default">{totalUnread} non letti</Badge>
          )}
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

      {/* Chat list */}
      <div className="p-4 space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))
        ) : filteredRows && filteredRows.length > 0 ? (
          filteredRows.map((row) => (
            <ChatCard key={row.atleta_user_id} row={row} currentUserId={user?.id || ''} />
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
    </div>
  );
}

function ChatCard({ row, currentUserId }: { row: AthleteChatRow; currentUserId: string }) {
  const name = `${row.profile?.first_name || ''} ${row.profile?.last_name || ''}`.trim() || 'Atleta';
  const initials = `${row.profile?.first_name?.[0] || ''}${row.profile?.last_name?.[0] || ''}`;
  const hasUnread = row.unreadCount > 0;

  const isOwnMessage = row.lastMessage?.sender_user_id === currentUserId;
  const messagePreview = row.lastMessage?.content
    ? (isOwnMessage ? 'Tu: ' : '') + row.lastMessage.content
    : 'Nessuna conversazione';

  const timeAgo = row.lastMessage?.created_at
    ? formatDistanceToNow(new Date(row.lastMessage.created_at), { addSuffix: true, locale: it })
    : null;

  return (
    <Link to={`/pt/app/chat/${row.atleta_user_id}`}>
      <Card
        className={cn(
          'hover:bg-muted/50 transition-colors',
          hasUnread && 'border-primary/30 bg-primary/5'
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
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
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
    </Link>
  );
}

export default PTAppChatPage;
