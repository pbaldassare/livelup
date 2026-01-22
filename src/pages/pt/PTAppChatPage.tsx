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
  Circle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// =====================================================
// PT APP CHAT PAGE - Lista conversazioni (Mobile)
// =====================================================

export function PTAppChatPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch chats with last message
  const { data: chats, isLoading } = useQuery({
    queryKey: ['pt-chats', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('chats')
        .select('id, atleta_user_id, last_message_at, is_active')
        .eq('pt_user_id', user.id)
        .eq('is_active', true)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles and last messages
      const chatsWithDetails = await Promise.all(
        (data || []).map(async (chat) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('user_id', chat.atleta_user_id)
            .single();

          // Get last message
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content, sender_user_id, created_at, is_read')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Count unread
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chat.id)
            .neq('sender_user_id', user.id)
            .eq('is_read', false);

          return {
            ...chat,
            profiles: profile,
            lastMessage,
            unreadCount: unreadCount || 0,
          };
        })
      );

      return chatsWithDetails;
    },
    enabled: !!user?.id,
  });

  // Filter chats
  const filteredChats = chats?.filter(chat => {
    if (!searchQuery) return true;
    const name = `${chat.profiles?.first_name || ''} ${chat.profiles?.last_name || ''}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const totalUnread = chats?.reduce((sum, chat) => sum + chat.unreadCount, 0) || 0;

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
            placeholder="Cerca conversazione..."
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
        ) : filteredChats && filteredChats.length > 0 ? (
          filteredChats.map((chat) => (
            <ChatCard key={chat.id} chat={chat} currentUserId={user?.id || ''} />
          ))
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Nessuna chat</h3>
              <p className="text-sm text-muted-foreground">
                Le conversazioni con i tuoi atleti appariranno qui
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ChatCard({ chat, currentUserId }: { chat: any; currentUserId: string }) {
  const name = `${chat.profiles?.first_name || ''} ${chat.profiles?.last_name || ''}`.trim() || 'Atleta';
  const initials = `${chat.profiles?.first_name?.[0] || ''}${chat.profiles?.last_name?.[0] || ''}`;
  const hasUnread = chat.unreadCount > 0;
  
  const isOwnMessage = chat.lastMessage?.sender_user_id === currentUserId;
  const messagePreview = chat.lastMessage?.content 
    ? (isOwnMessage ? 'Tu: ' : '') + chat.lastMessage.content
    : 'Nessun messaggio';

  const timeAgo = chat.lastMessage?.created_at 
    ? formatDistanceToNow(new Date(chat.lastMessage.created_at), { addSuffix: true, locale: it })
    : null;

  return (
    <Link to={`/pt/app/chat/${chat.atleta_user_id}`}>
      <Card className={cn(
        'hover:bg-muted/50 transition-colors',
        hasUnread && 'border-primary/30 bg-primary/5'
      )}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src={chat.profiles?.avatar_url || undefined} />
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
              
              <p className={cn(
                'text-sm truncate mt-0.5',
                hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}>
                {messagePreview}
              </p>
              
              {hasUnread && (
                <Badge variant="default" className="mt-1 text-xs">
                  {chat.unreadCount} {chat.unreadCount === 1 ? 'nuovo' : 'nuovi'}
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
