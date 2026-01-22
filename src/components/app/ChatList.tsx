import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Users, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

// =====================================================
// CHAT LIST - Lista chat con tabs
// Design reference: Ladder_iOS_109.png
// =====================================================

interface ChatItem {
  id: string;
  recipientUserId: string;
  name: string;
  avatarUrl?: string | null;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  isPinned?: boolean;
}

interface ChatListProps {
  chats: ChatItem[];
  isLoading?: boolean;
  onSearch?: (query: string) => void;
  basePath: string;
  showTabs?: boolean;
}

export function ChatList({
  chats,
  isLoading,
  onSearch,
  basePath,
  showTabs = true,
}: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('direct');

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    return chat.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full bg-app-background">
      {/* Header */}
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-app-foreground">CHAT</h1>
          <button className="px-3 py-1.5 rounded-full bg-app-muted text-app-foreground text-sm flex items-center gap-1.5">
            <Search className="h-4 w-4" />
            Members
          </button>
        </div>

        {/* Tabs */}
        {showTabs && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full bg-transparent border-b border-app-border rounded-none p-0 h-auto">
              <TabsTrigger 
                value="communities" 
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-app-accent data-[state=active]:bg-transparent text-app-muted-foreground data-[state=active]:text-app-foreground pb-3"
              >
                Communities
              </TabsTrigger>
              <TabsTrigger 
                value="direct" 
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-app-accent data-[state=active]:bg-transparent text-app-muted-foreground data-[state=active]:text-app-foreground pb-3"
              >
                Direct Messages
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* Chat items */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-app-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filteredChats.length > 0 ? (
          <div className="divide-y divide-app-border">
            {filteredChats.map((chat) => (
              <ChatListItem key={chat.id} chat={chat} basePath={basePath} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center p-4">
            <MessageCircle className="h-12 w-12 text-app-muted-foreground mb-4" />
            <p className="text-app-muted-foreground">Nessuna conversazione</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatListItem({ chat, basePath }: { chat: ChatItem; basePath: string }) {
  const initials = chat.name.split(' ').map(n => n[0]).join('').slice(0, 2);
  
  const timeAgo = chat.lastMessageAt
    ? formatDistanceToNow(new Date(chat.lastMessageAt), { addSuffix: false, locale: it })
    : null;

  return (
    <Link 
      to={`${basePath}/${chat.recipientUserId}`}
      className="flex items-center gap-3 p-4 hover:bg-app-muted/50 transition-colors"
    >
      <div className="relative">
        <Avatar className="h-12 w-12">
          <AvatarImage src={chat.avatarUrl || undefined} />
          <AvatarFallback className="bg-app-muted text-app-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        {chat.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-app-accent text-app-accent-foreground text-xs font-bold rounded-full flex items-center justify-center">
            {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className={cn(
            'font-semibold text-app-foreground truncate',
            chat.unreadCount > 0 && 'font-bold'
          )}>
            {chat.name}
          </h3>
          {timeAgo && (
            <span className="text-xs text-app-muted-foreground">{timeAgo}</span>
          )}
        </div>
        
        {chat.lastMessage && (
          <p className={cn(
            'text-sm truncate',
            chat.unreadCount > 0 ? 'text-app-foreground' : 'text-app-muted-foreground'
          )}>
            {chat.lastMessage}
          </p>
        )}
      </div>
    </Link>
  );
}

export default ChatList;
