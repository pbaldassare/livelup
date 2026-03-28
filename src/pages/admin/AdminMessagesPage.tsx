import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { MessageSquare, Send, Users, UserCog, Globe, User, Eye, Mail, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';

// =====================================================
// ADMIN MESSAGES PAGE - Broadcast + Chat Log
// =====================================================

export default function AdminMessagesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('broadcast');

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Messaggi"
        subtitle="Invia comunicazioni broadcast e monitora le chat della piattaforma"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="broadcast" className="gap-2">
            <Send className="h-4 w-4" />
            Broadcast
          </TabsTrigger>
          <TabsTrigger value="chat-log" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Log Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="broadcast" className="space-y-6">
          <BroadcastTab userId={user?.id} />
        </TabsContent>

        <TabsContent value="chat-log" className="space-y-6">
          <ChatLogTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =====================================================
// BROADCAST TAB
// =====================================================

function BroadcastTab({ userId }: { userId?: string }) {
  const queryClient = useQueryClient();
  const [targetType, setTargetType] = useState('all_users');
  const [targetUserId, setTargetUserId] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Search users for single_user target
  const { data: searchResults } = useQuery({
    queryKey: ['admin-user-search', userSearch],
    queryFn: async () => {
      if (!userSearch || userSearch.length < 2) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .or(`first_name.ilike.%${userSearch}%,last_name.ilike.%${userSearch}%,email.ilike.%${userSearch}%`)
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: targetType === 'single_user' && userSearch.length >= 2,
  });

  // Fetch broadcast history
  const { data: broadcasts } = useQuery({
    queryKey: ['admin-broadcasts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_broadcasts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;

      // Get read counts for each broadcast
      const broadcastsWithStats = await Promise.all(
        (data || []).map(async (b) => {
          const { count } = await supabase
            .from('admin_broadcast_recipients')
            .select('*', { count: 'exact', head: true })
            .eq('broadcast_id', b.id)
            .eq('is_read', true);
          return { ...b, read_count: count || 0 };
        })
      );
      return broadcastsWithStats;
    },
  });

  // Send broadcast mutation
  const sendBroadcast = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Non autenticato');
      if (!subject.trim() || !content.trim()) throw new Error('Compila tutti i campi');

      // Get target users
      let targetUsers: string[] = [];

      if (targetType === 'single_user') {
        if (!targetUserId) throw new Error('Seleziona un utente');
        targetUsers = [targetUserId];
      } else {
        // Query user_roles based on target
        let roleFilter: 'admin' | 'atleta' | 'pt' | null = null;
        if (targetType === 'all_athletes') roleFilter = 'atleta';
        if (targetType === 'all_pts') roleFilter = 'pt';

        const query = supabase.from('user_roles').select('user_id');
        if (roleFilter) {
          query.eq('role', roleFilter as any);
        }
        const { data: roleData, error: roleError } = await query;
        if (roleError) throw roleError;
        targetUsers = (roleData || []).map(r => r.user_id);
      }

      if (targetUsers.length === 0) throw new Error('Nessun destinatario trovato');

      // Create broadcast record
      const { data: broadcast, error: broadcastError } = await supabase
        .from('admin_broadcasts')
        .insert({
          sender_user_id: userId,
          subject: subject.trim(),
          content: content.trim(),
          target_type: targetType,
          target_user_id: targetType === 'single_user' ? targetUserId : null,
          recipients_count: targetUsers.length,
        })
        .select()
        .single();
      if (broadcastError) throw broadcastError;

      // Create recipients
      const recipients = targetUsers.map(uid => ({
        broadcast_id: broadcast.id,
        user_id: uid,
      }));

      // Insert in batches of 100
      for (let i = 0; i < recipients.length; i += 100) {
        const batch = recipients.slice(i, i + 100);
        const { error: recipError } = await supabase
          .from('admin_broadcast_recipients')
          .insert(batch);
        if (recipError) throw recipError;
      }

      // Create notifications for each user
      const notifications = targetUsers.map(uid => ({
        user_id: uid,
        type: 'broadcast',
        title: subject.trim(),
        body: content.trim().substring(0, 200),
        data: { broadcast_id: broadcast.id } as any,
      }));

      for (let i = 0; i < notifications.length; i += 100) {
        const batch = notifications.slice(i, i + 100);
        const { error: notifError } = await supabase
          .from('notifications')
          .insert(batch);
        if (notifError) console.error('Notif error:', notifError);
      }

      return broadcast;
    },
    onSuccess: () => {
      toast.success('Broadcast inviato con successo!');
      setSubject('');
      setContent('');
      setTargetUserId('');
      setUserSearch('');
      queryClient.invalidateQueries({ queryKey: ['admin-broadcasts'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Errore nell\'invio');
    },
  });

  const targetLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    all_users: { label: 'Tutti gli utenti', icon: <Globe className="h-4 w-4" /> },
    all_athletes: { label: 'Tutti gli atleti', icon: <Users className="h-4 w-4" /> },
    all_pts: { label: 'Tutti i PT', icon: <UserCog className="h-4 w-4" /> },
    single_user: { label: 'Utente specifico', icon: <User className="h-4 w-4" /> },
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Nuovo Broadcast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Destinatari</Label>
            <Select value={targetType} onValueChange={setTargetType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_users">
                  <span className="flex items-center gap-2">
                    <Globe className="h-4 w-4" /> Tutti gli utenti
                  </span>
                </SelectItem>
                <SelectItem value="all_athletes">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" /> Tutti gli atleti
                  </span>
                </SelectItem>
                <SelectItem value="all_pts">
                  <span className="flex items-center gap-2">
                    <UserCog className="h-4 w-4" /> Tutti i PT
                  </span>
                </SelectItem>
                <SelectItem value="single_user">
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" /> Utente specifico
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {targetType === 'single_user' && (
            <div className="space-y-2">
              <Label>Cerca utente</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome, cognome o email..."
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setTargetUserId(''); }}
                  className="pl-9"
                />
              </div>
              {searchResults && searchResults.length > 0 && !targetUserId && (
                <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                  {searchResults.map((u) => (
                    <button
                      key={u.user_id}
                      onClick={() => {
                        setTargetUserId(u.user_id);
                        setUserSearch(`${u.first_name || ''} ${u.last_name || ''} (${u.email || ''})`);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                    >
                      <span className="font-medium">{u.first_name} {u.last_name}</span>
                      <span className="text-muted-foreground ml-2">{u.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Oggetto</Label>
            <Input
              placeholder="Oggetto del messaggio..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Contenuto</Label>
            <Textarea
              placeholder="Scrivi il messaggio..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
            />
          </div>

          <Button
            onClick={() => sendBroadcast.mutate()}
            disabled={sendBroadcast.isPending || !subject.trim() || !content.trim()}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {sendBroadcast.isPending ? 'Invio in corso...' : 'Invia Broadcast'}
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Storico Broadcast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[460px]">
            {!broadcasts || broadcasts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nessun broadcast inviato
              </p>
            ) : (
              <div className="space-y-3">
                {broadcasts.map((b) => (
                  <div key={b.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm line-clamp-1">{b.subject}</h4>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {targetLabels[b.target_type]?.label || b.target_type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{b.content}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{format(new Date(b.created_at), 'dd MMM yyyy HH:mm', { locale: it })}</span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {b.recipients_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {b.read_count}/{b.recipients_count}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// =====================================================
// CHAT LOG TAB
// =====================================================

function ChatLogTab() {
  const [search, setSearch] = useState('');
  const [selectedChat, setSelectedChat] = useState<string | null>(null);

  // Fetch all chats with profiles
  const { data: chats, isLoading } = useQuery({
    queryKey: ['admin-chat-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .order('last_message_at', { ascending: false });
      if (error) throw error;

      // Enrich with profile info and message count
      const enriched = await Promise.all(
        (data || []).map(async (chat) => {
          const [ptProfile, atletaProfile, msgCount] = await Promise.all([
            supabase
              .from('profiles')
              .select('first_name, last_name, email')
              .eq('user_id', chat.pt_user_id)
              .single(),
            supabase
              .from('profiles')
              .select('first_name, last_name, email')
              .eq('user_id', chat.atleta_user_id)
              .single(),
            supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('chat_id', chat.id),
          ]);

          // Get last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content, created_at, sender_user_id')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...chat,
            pt_name: ptProfile.data
              ? `${ptProfile.data.first_name || ''} ${ptProfile.data.last_name || ''}`.trim() || ptProfile.data.email
              : 'PT sconosciuto',
            atleta_name: atletaProfile.data
              ? `${atletaProfile.data.first_name || ''} ${atletaProfile.data.last_name || ''}`.trim() || atletaProfile.data.email
              : 'Atleta sconosciuto',
            message_count: msgCount.count || 0,
            last_message: lastMsg || null,
          };
        })
      );

      return enriched;
    },
  });

  const filteredChats = chats?.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.pt_name.toLowerCase().includes(s) || c.atleta_name.toLowerCase().includes(s);
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Log Chat Piattaforma
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca PT o Atleta..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Caricamento...</p>
          ) : !filteredChats || filteredChats.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nessuna chat trovata</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">PT</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Atleta</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Ultimo messaggio</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Data</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Messaggi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredChats.map((chat) => (
                    <tr
                      key={chat.id}
                      onClick={() => setSelectedChat(chat.id)}
                      className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <UserCog className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{chat.pt_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{chat.atleta_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-muted-foreground line-clamp-1 max-w-[200px]">
                          {chat.last_message?.content || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground whitespace-nowrap">
                        {chat.last_message_at
                          ? format(new Date(chat.last_message_at), 'dd/MM/yy HH:mm')
                          : '—'}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Badge variant="secondary">{chat.message_count}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat detail sheet */}
      <ChatDetailSheet chatId={selectedChat} onClose={() => setSelectedChat(null)} />
    </>
  );
}

// =====================================================
// CHAT DETAIL SHEET
// =====================================================

function ChatDetailSheet({ chatId, onClose }: { chatId: string | null; onClose: () => void }) {
  const { data: messages, isLoading } = useQuery({
    queryKey: ['admin-chat-messages', chatId],
    queryFn: async () => {
      if (!chatId) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      // Get chat participants info
      const { data: chat } = await supabase
        .from('chats')
        .select('pt_user_id, atleta_user_id')
        .eq('id', chatId)
        .single();

      return (data || []).map(msg => ({
        ...msg,
        is_pt: msg.sender_user_id === chat?.pt_user_id,
      }));
    },
    enabled: !!chatId,
  });

  return (
    <Sheet open={!!chatId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Storico Chat
          </SheetTitle>
        </SheetHeader>
        <Separator className="my-4" />
        <ScrollArea className="h-[calc(100vh-120px)]">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Caricamento...</p>
          ) : !messages || messages.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nessun messaggio</p>
          ) : (
            <div className="space-y-3 pr-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.is_pt ? 'items-start' : 'items-end'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      msg.is_pt
                        ? 'bg-muted text-foreground'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-1 px-1">
                    <Badge variant="outline" className="text-[10px] h-4">
                      {msg.is_pt ? 'PT' : 'Atleta'}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(msg.created_at), 'dd/MM HH:mm')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
