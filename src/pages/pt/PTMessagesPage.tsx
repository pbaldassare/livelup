import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Search } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getOrCreateChat } from '@/lib/api/messages';

// =====================================================
// PT MESSAGES PAGE - Chat con Atleti (web dashboard)
// Mostra SEMPRE tutti gli atleti collegati, anche senza chat aperta.
// =====================================================

interface AthleteRow {
  atleta_user_id: string;
  chat_id: string | null;
  profile: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
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
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch tutti gli atleti collegati + chat (se esistente)
  const { data: rows = [], isLoading: rowsLoading } = useQuery({
    queryKey: ['pt-athletes-chats', user?.id],
    queryFn: async (): Promise<AthleteRow[]> => {
      if (!user?.id) return [];

      const { data: connections, error: connErr } = await supabase
        .from('pt_atleta_connections')
        .select('atleta_user_id')
        .eq('pt_user_id', user.id)
        .eq('status', 'active');

      if (connErr) throw connErr;

      const athleteIds = (connections || []).map((c) => c.atleta_user_id);
      if (athleteIds.length === 0) return [];

      const { data: chatsData } = await supabase
        .from('chats')
        .select('id, atleta_user_id, last_message_at')
        .eq('pt_user_id', user.id)
        .in('atleta_user_id', athleteIds);

      const chatByAthlete = new Map<string, { id: string; last_message_at: string | null }>();
      (chatsData || []).forEach((c) => {
        chatByAthlete.set(c.atleta_user_id, { id: c.id, last_message_at: c.last_message_at });
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, avatar_url')
        .in('user_id', athleteIds);

      const profileByUser = new Map<string, AthleteRow['profile']>();
      (profiles || []).forEach((p) => {
        profileByUser.set(p.user_id, {
          first_name: p.first_name,
          last_name: p.last_name,
          avatar_url: p.avatar_url,
        });
      });

      const enriched = await Promise.all(
        athleteIds.map(async (athleteId) => {
          const chat = chatByAthlete.get(athleteId) || null;

          let lastMessage: string | null = null;
          let lastMessageAt: string | null = null;
          let unreadCount = 0;

          if (chat) {
            const { data: lastMsg } = await supabase
              .from('messages')
              .select('content, created_at')
              .eq('chat_id', chat.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            lastMessage = lastMsg?.content ?? null;
            lastMessageAt = lastMsg?.created_at ?? chat.last_message_at;

            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('chat_id', chat.id)
              .eq('is_read', false)
              .neq('sender_user_id', user.id);

            unreadCount = count || 0;
          }

          return {
            atleta_user_id: athleteId,
            chat_id: chat?.id || null,
            profile: profileByUser.get(athleteId) || null,
            lastMessage,
            lastMessageAt,
            unreadCount,
          } as AthleteRow;
        })
      );

      enriched.sort((a, b) => {
        const aHas = !!a.lastMessageAt;
        const bHas = !!b.lastMessageAt;
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;
        if (aHas && bHas) {
          return new Date(b.lastMessageAt!).getTime() - new Date(a.lastMessageAt!).getTime();
        }
        const aName = `${a.profile?.first_name || ''} ${a.profile?.last_name || ''}`.trim();
        const bName = `${b.profile?.first_name || ''} ${b.profile?.last_name || ''}`.trim();
        return aName.localeCompare(bName);
      });

      return enriched;
    },
    enabled: !!user?.id,
  });

  const selectedRow = rows.find((r) => r.atleta_user_id === selectedAthleteId) || null;
  const selectedChatId = selectedRow?.chat_id || null;

  // Fetch messaggi (solo se la chat esiste)
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

  // Invio messaggio: crea chat on-demand se non esiste
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id || !selectedAthleteId) throw new Error('Stato non valido');

      let chatId = selectedChatId;
      if (!chatId) {
        const chat = await getOrCreateChat(user.id, selectedAthleteId);
        chatId = chat.id;
      }

      const { error } = await supabase.from('messages').insert({
        chat_id: chatId,
        sender_user_id: user.id,
        content,
      });

      if (error) throw error;

      await supabase
        .from('chats')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', chatId);

      return chatId;
    },
    onSuccess: (chatId) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', chatId] });
      queryClient.invalidateQueries({ queryKey: ['pt-athletes-chats'] });
      setMessageInput('');
    },
    onError: (e: any) => {
      toast.error(e?.message || "Errore durante l'invio del messaggio");
    },
  });

  // Mark as read quando si seleziona una chat esistente
  useEffect(() => {
    if (selectedChatId && user?.id) {
      supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('chat_id', selectedChatId)
        .neq('sender_user_id', user.id)
        .eq('is_read', false)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['pt-athletes-chats'] });
        });
    }
  }, [selectedChatId, user?.id, queryClient]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime su chat selezionata
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

  const filteredRows = rows.filter((r) => {
    const name = `${r.profile?.first_name || ''} ${r.profile?.last_name || ''}`.toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

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
        description="Chat con i tuoi atleti collegati"
        icon={MessageSquare}
      />

      <div className="grid gap-6 lg:grid-cols-3 lg:h-[calc(100dvh-280px)]">
        {/* Athletes List */}
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
              {rowsLoading ? (
                <div className="p-4 text-center text-muted-foreground">Caricamento...</div>
              ) : filteredRows.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  Nessun atleta collegato
                </div>
              ) : (
                <div className="divide-y">
                  {filteredRows.map((row) => (
                    <button
                      key={row.atleta_user_id}
                      onClick={() => setSelectedAthleteId(row.atleta_user_id)}
                      className={cn(
                        'w-full p-4 text-left hover:bg-accent/50 transition-colors',
                        selectedAthleteId === row.atleta_user_id && 'bg-accent'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-role-atleta/10 text-role-atleta overflow-hidden">
                          {row.profile?.avatar_url ? (
                            <img
                              src={row.profile.avatar_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <>
                              {row.profile?.first_name?.[0]}
                              {row.profile?.last_name?.[0]}
                            </>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">
                              {row.profile?.first_name} {row.profile?.last_name}
                            </p>
                            {row.unreadCount > 0 && (
                              <span className="flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-role-pt text-[10px] text-white">
                                {row.unreadCount}
                              </span>
                            )}
                          </div>
                          <p
                            className={cn(
                              'text-sm truncate',
                              row.lastMessage
                                ? 'text-muted-foreground'
                                : 'text-muted-foreground italic'
                            )}
                          >
                            {row.lastMessage || 'Nessuna conversazione'}
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
          {selectedRow ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-role-atleta/10 text-role-atleta overflow-hidden">
                    {selectedRow.profile?.avatar_url ? (
                      <img
                        src={selectedRow.profile.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <>
                        {selectedRow.profile?.first_name?.[0]}
                        {selectedRow.profile?.last_name?.[0]}
                      </>
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {selectedRow.profile?.first_name} {selectedRow.profile?.last_name}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                <ScrollArea className="min-h-0 flex-1 p-4">
                  {!selectedChatId ? (
                    <div className="text-center text-muted-foreground py-8">
                      Nessun messaggio ancora. Scrivi il primo messaggio!
                    </div>
                  ) : messagesLoading ? (
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
                            className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
                          >
                            <div
                              className={cn(
                                'max-w-[70%] rounded-lg px-4 py-2',
                                isOwn ? 'bg-role-pt text-white' : 'bg-muted'
                              )}
                            >
                              <p>{message.content}</p>
                              <p
                                className={cn(
                                  'text-[10px] mt-1',
                                  isOwn ? 'text-white/70' : 'text-muted-foreground'
                                )}
                              >
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
                      placeholder="Scrivi il primo messaggio..."
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
                <p>Seleziona un atleta per iniziare la conversazione</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

export default PTMessagesPage;
