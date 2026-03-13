import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Send,
  Search,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// =====================================================
// PT MESSAGES PAGE - Chat con Atleti
// Solo per ruolo: pt (web dashboard)
// =====================================================

interface Chat {
  id: string;
  atleta_user_id: string;
  last_message_at: string | null;
  is_active: boolean;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
  lastMessage?: string;
  unreadCount?: number;
}

interface Message {
  id: string;
  chat_id: string;
  sender_user_id: string;
  content: string | null;
  created_at: string;
  is_read: boolean;
}

export function PTMessagesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch chats
  const { data: chats = [], isLoading: chatsLoading } = useQuery({
    queryKey: ['pt-chats', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: chatsData, error } = await supabase
        .from('chats')
        .select('*')
        .eq('pt_user_id', user.id)
        .eq('is_active', true)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Enrich with profile data
      const enrichedChats = await Promise.all(
        (chatsData || []).map(async (chat) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('user_id', chat.atleta_user_id)
            .single();

          // Get last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Count unread
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chat.id)
            .eq('is_read', false)
            .neq('sender_user_id', user.id);

          return {
            ...chat,
            profile,
            lastMessage: lastMsg?.content,
            unreadCount: count || 0,
          };
        })
      );

      return enrichedChats as Chat[];
    },
    enabled: !!user?.id,
  });

  // Fetch messages for selected chat
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['chat-messages', selectedChatId],
    queryFn: async () => {
      if (!selectedChatId) return [];

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', selectedChatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!selectedChatId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id || !selectedChatId) throw new Error('Invalid state');

      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: selectedChatId,
          sender_user_id: user.id,
          content,
        });

      if (error) throw error;

      // Update chat's last_message_at
      await supabase
        .from('chats')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedChatId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', selectedChatId] });
      queryClient.invalidateQueries({ queryKey: ['pt-chats'] });
      setMessageInput('');
    },
    onError: () => {
      toast.error('Errore durante l\'invio del messaggio');
    },
  });

  // Mark messages as read when chat is selected
  useEffect(() => {
    if (selectedChatId && user?.id) {
      supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('chat_id', selectedChatId)
        .neq('sender_user_id', user.id)
        .eq('is_read', false)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['pt-chats'] });
        });
    }
  }, [selectedChatId, user?.id, queryClient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!selectedChatId) return;

    const channel = supabase
      .channel(`messages:${selectedChatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${selectedChatId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-messages', selectedChatId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChatId, queryClient]);

  const filteredChats = chats.filter((chat) => {
    const name = `${chat.profile?.first_name || ''} ${chat.profile?.last_name || ''}`.toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  const selectedChat = chats.find((c) => c.id === selectedChatId);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim()) {
      sendMessageMutation.mutate(messageInput.trim());
    }
  };

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title="Messaggi"
        description="Chat con i tuoi atleti"
        icon={MessageSquare}
      />

      <div className="grid gap-6 lg:grid-cols-3 lg:h-[calc(100dvh-280px)]">
        {/* Chat List */}
        <Card className="lg:col-span-1 lg:min-h-0">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca atleta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 lg:min-h-0">
            <ScrollArea className="max-h-[60dvh] lg:h-[calc(100dvh-400px)]">
              {chatsLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Caricamento...
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  Nessuna chat trovata
                </div>
              ) : (
                <div className="divide-y">
                  {filteredChats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => setSelectedChatId(chat.id)}
                      className={cn(
                        'w-full p-4 text-left hover:bg-accent/50 transition-colors',
                        selectedChatId === chat.id && 'bg-accent'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-role-atleta/10 text-role-atleta">
                          {chat.profile?.first_name?.[0]}{chat.profile?.last_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">
                              {chat.profile?.first_name} {chat.profile?.last_name}
                            </p>
                            {chat.unreadCount && chat.unreadCount > 0 && (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-role-pt text-[10px] text-white">
                                {chat.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {chat.lastMessage || 'Nessun messaggio'}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Messages */}
        <Card className="lg:col-span-2 flex min-h-0 flex-col">
          {selectedChat ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-role-atleta/10 text-role-atleta">
                    {selectedChat.profile?.first_name?.[0]}{selectedChat.profile?.last_name?.[0]}
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {selectedChat.profile?.first_name} {selectedChat.profile?.last_name}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                <ScrollArea className="min-h-0 flex-1 p-4">
                  {messagesLoading ? (
                    <div className="text-center text-muted-foreground">
                      Caricamento messaggi...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      Nessun messaggio. Inizia la conversazione!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const isOwn = message.sender_user_id === user?.id;
                        return (
                          <div
                            key={message.id}
                            className={cn(
                              'flex',
                              isOwn ? 'justify-end' : 'justify-start'
                            )}
                          >
                            <div
                              className={cn(
                                'max-w-[70%] rounded-lg px-4 py-2',
                                isOwn
                                  ? 'bg-role-pt text-white'
                                  : 'bg-muted'
                              )}
                            >
                              <p>{message.content}</p>
                              <p className={cn(
                                'text-[10px] mt-1',
                                isOwn ? 'text-white/70' : 'text-muted-foreground'
                              )}>
                                {format(new Date(message.created_at), 'HH:mm')}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
                <form onSubmit={handleSendMessage} className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Scrivi un messaggio..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      disabled={sendMessageMutation.isPending}
                    />
                    <Button 
                      type="submit" 
                      disabled={!messageInput.trim() || sendMessageMutation.isPending}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Seleziona una chat per iniziare</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

export default PTMessagesPage;
