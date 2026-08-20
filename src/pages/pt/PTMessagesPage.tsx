import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Search, Users, Plus, Settings, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getOrCreateChat, markMessagesAsRead } from '@/lib/api/messages';
import {
  getPTChatGroups,
  getChatGroupMessages,
  sendChatGroupMessage,
  subscribeToChatGroupMessages,
  markChatGroupRead,
  getChatGroupMembers,
} from '@/lib/api/chatGroups';
import { getPTRelevantCommunityGroups } from '@/lib/api/groups';
import type { ChatGroupWithMeta } from '@/types/chatGroups';
import type { GroupWithDetails } from '@/types/groups';
import { CreateChatGroupDialog } from '@/components/pt/CreateChatGroupDialog';
import { ManageChatGroupSheet } from '@/components/pt/ManageChatGroupSheet';
import { GroupChatPanel } from '@/components/groups/GroupChatPanel';

// =====================================================
// PT MESSAGES PAGE - Chat con Atleti e Gruppi (web dashboard)
// - Atleti collegati (1:1)
// - Gruppi chat PT (pt_chat_groups)
// - Gruppi community creati dal PT o dai suoi atleti collegati (groups)
// =====================================================

interface AthleteRow {
  atleta_user_id: string;
  chat_id: string | null;
  profile: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    email: string | null;
  } | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

interface Message {
  id: string;
  chat_id?: string | null;
  chat_group_id?: string | null;
  sender_user_id: string;
  content: string | null;
  attachment_url?: string | null;
  attachment_type?: string | null;
  created_at: string;
  is_read: boolean;
  senderName?: string;
}

type Selection =
  | { kind: 'athlete'; id: string }
  | { kind: 'chatGroup'; id: string }
  | { kind: 'communityGroup'; id: string };

type ListItem =
  | { kind: 'athlete'; sortAt: number; row: AthleteRow }
  | { kind: 'chatGroup'; sortAt: number; group: ChatGroupWithMeta }
  | { kind: 'communityGroup'; sortAt: number; group: GroupWithDetails };

export function PTMessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [manageGroupOpen, setManageGroupOpen] = useState(false);
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
        .select('user_id, first_name, last_name, avatar_url, email')
        .in('user_id', athleteIds);

      const profileByUser = new Map<string, AthleteRow['profile']>();
      (profiles || []).forEach((p) => {
        profileByUser.set(p.user_id, {
          first_name: p.first_name,
          last_name: p.last_name,
          avatar_url: p.avatar_url,
          email: p.email,
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

  const {
    data: chatGroups = [],
    isLoading: chatGroupsLoading,
    isError: chatGroupsError,
  } = useQuery({
    queryKey: ['pt-chat-groups', user?.id],
    queryFn: async () => {
      try {
        return await getPTChatGroups(user!.id);
      } catch (err) {
        console.error('Errore caricamento gruppi chat PT:', err);
        throw err;
      }
    },
    enabled: !!user?.id,
    retry: 1,
  });

  const {
    data: communityGroups = [],
    isLoading: communityGroupsLoading,
    isError: communityGroupsError,
  } = useQuery({
    queryKey: ['pt-community-groups', user?.id],
    queryFn: async () => {
      try {
        return await getPTRelevantCommunityGroups(user!.id);
      } catch (err) {
        console.error('Errore caricamento gruppi community PT:', err);
        throw err;
      }
    },
    enabled: !!user?.id,
    retry: 1,
  });

  const selectedAthleteId = selection?.kind === 'athlete' ? selection.id : null;
  const selectedChatGroupId = selection?.kind === 'chatGroup' ? selection.id : null;
  const selectedCommunityId =
    selection?.kind === 'communityGroup' ? selection.id : null;

  const selectedRow = rows.find((r) => r.atleta_user_id === selectedAthleteId) || null;
  const selectedChatId = selectedRow?.chat_id || null;
  const selectedChatGroup = chatGroups.find((g) => g.id === selectedChatGroupId) || null;
  const selectedCommunity =
    communityGroups.find((g) => g.id === selectedCommunityId) || null;

  // Auto-select from URL (?athlete= / ?chat= / ?group= chat / ?community=)
  useEffect(() => {
    const athleteParam = searchParams.get('athlete');
    const chatParam = searchParams.get('chat');
    const groupParam = searchParams.get('group');
    const communityParam = searchParams.get('community');

    if (communityParam) {
      if (communityGroups.some((g) => g.id === communityParam)) {
        setSelection({ kind: 'communityGroup', id: communityParam });
        searchParams.delete('community');
        setSearchParams(searchParams, { replace: true });
      }
      return;
    }

    if (groupParam) {
      if (chatGroups.some((g) => g.id === groupParam)) {
        setSelection({ kind: 'chatGroup', id: groupParam });
        searchParams.delete('group');
        setSearchParams(searchParams, { replace: true });
      }
      return;
    }

    if (athleteParam && rows.some((r) => r.atleta_user_id === athleteParam)) {
      setSelection({ kind: 'athlete', id: athleteParam });
      searchParams.delete('athlete');
      setSearchParams(searchParams, { replace: true });
    } else if (chatParam) {
      const match = rows.find((r) => r.chat_id === chatParam);
      if (match) {
        setSelection({ kind: 'athlete', id: match.atleta_user_id });
        searchParams.delete('chat');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, rows, chatGroups, communityGroups, setSearchParams]);

  // Messaggi 1:1
  const { data: athleteMessages = [], isLoading: athleteMessagesLoading } = useQuery({
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
    enabled: !!selectedChatId && selection?.kind === 'athlete',
  });

  // Messaggi gruppo chat PT
  const { data: groupMessages = [], isLoading: groupMessagesLoading } = useQuery({
    queryKey: ['chat-group-messages', selectedChatGroupId],
    queryFn: async () => {
      if (!selectedChatGroupId) return [];
      const messagesData = await getChatGroupMessages(selectedChatGroupId);
      const senderIds = [...new Set(messagesData.map((m) => m.sender_user_id))];
      const { data: profiles } = senderIds.length
        ? await supabase
            .from('profiles')
            .select('user_id, first_name, last_name')
            .in('user_id', senderIds)
        : { data: [] };
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      return messagesData.map((msg) => {
        const profile = profileMap.get(msg.sender_user_id);
        const senderName = profile
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Atleta'
          : 'Atleta';
        return {
          id: msg.id,
          chat_group_id: msg.chat_group_id,
          sender_user_id: msg.sender_user_id,
          content: msg.content,
          attachment_url: msg.attachment_url,
          attachment_type: msg.attachment_type,
          created_at: msg.created_at,
          is_read: true,
          senderName,
        } as Message;
      });
    },
    enabled: !!selectedChatGroupId && selection?.kind === 'chatGroup',
  });

  const { data: groupMembers } = useQuery({
    queryKey: ['chat-group-members', selectedChatGroupId],
    queryFn: () => getChatGroupMembers(selectedChatGroupId!),
    enabled: !!selectedChatGroupId && selection?.kind === 'chatGroup',
  });

  const messages = selection?.kind === 'chatGroup' ? groupMessages : athleteMessages;
  const messagesLoading =
    selection?.kind === 'chatGroup' ? groupMessagesLoading : athleteMessagesLoading;

  const sendAthleteMutation = useMutation({
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
    onError: (e: Error) => {
      toast.error(e?.message || "Errore durante l'invio del messaggio");
    },
  });

  const sendGroupMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id || !selectedChatGroupId) throw new Error('Stato non valido');
      return sendChatGroupMessage({
        groupId: selectedChatGroupId,
        senderUserId: user.id,
        content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-group-messages', selectedChatGroupId] });
      queryClient.invalidateQueries({ queryKey: ['pt-chat-groups'] });
      setMessageInput('');
    },
    onError: (e: Error) => {
      toast.error(e?.message || "Errore durante l'invio del messaggio");
    },
  });

  const sendPending =
    selection?.kind === 'chatGroup'
      ? sendGroupMutation.isPending
      : sendAthleteMutation.isPending;

  // Mark as read — atleta (RPC: RLS blocca update diretto del destinatario)
  useEffect(() => {
    if (selection?.kind === 'athlete' && selectedChatId && user?.id) {
      markMessagesAsRead(selectedChatId, user.id)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['pt-athletes-chats'] });
          queryClient.invalidateQueries({ queryKey: ['pt-chats-with-athletes'] });
        })
        .catch(() => {});
    }
  }, [selection?.kind, selectedChatId, user?.id, queryClient]);

  // Mark as read — gruppo chat PT
  useEffect(() => {
    if (selection?.kind === 'chatGroup' && selectedChatGroupId && user?.id) {
      markChatGroupRead(selectedChatGroupId, user.id)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['pt-chat-groups'] });
        })
        .catch(() => {});
    }
  }, [selection?.kind, selectedChatGroupId, user?.id, queryClient]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime 1:1
  useEffect(() => {
    if (selection?.kind !== 'athlete' || !selectedChatId) return;
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
  }, [selection?.kind, selectedChatId, queryClient]);

  // Realtime gruppo chat PT
  useEffect(() => {
    if (selection?.kind !== 'chatGroup' || !selectedChatGroupId || !user?.id) return;
    const unsubscribe = subscribeToChatGroupMessages(selectedChatGroupId, () => {
      queryClient.invalidateQueries({ queryKey: ['chat-group-messages', selectedChatGroupId] });
      markChatGroupRead(selectedChatGroupId, user.id)
        .then(() => queryClient.invalidateQueries({ queryKey: ['pt-chat-groups'] }))
        .catch(() => {});
    });
    return unsubscribe;
  }, [selection?.kind, selectedChatGroupId, user?.id, queryClient]);

  const term = searchTerm.toLowerCase().trim();

  const athleteItems: ListItem[] = rows
    .filter((r) => {
      if (!term) return true;
      const name = `${r.profile?.first_name || ''} ${r.profile?.last_name || ''}`.toLowerCase();
      return name.includes(term);
    })
    .map((row) => ({
      kind: 'athlete' as const,
      sortAt: row.lastMessageAt ? new Date(row.lastMessageAt).getTime() : 0,
      row,
    }));

  const chatGroupItems: ListItem[] = (chatGroupsError ? [] : chatGroups)
    .filter((g) => {
      if (!term) return true;
      return g.name.toLowerCase().includes(term);
    })
    .map((group) => ({
      kind: 'chatGroup' as const,
      sortAt: group.last_message?.created_at
        ? new Date(group.last_message.created_at).getTime()
        : new Date(group.updated_at).getTime(),
      group,
    }));

  const communityGroupItems: ListItem[] = (communityGroupsError ? [] : communityGroups)
    .filter((g) => {
      if (!term) return true;
      const owner = (g.owner_name || '').toLowerCase();
      return g.name.toLowerCase().includes(term) || owner.includes(term);
    })
    .map((group) => ({
      kind: 'communityGroup' as const,
      sortAt: new Date(group.updated_at).getTime(),
      group,
    }));

  const listItems: ListItem[] = [
    ...athleteItems,
    ...chatGroupItems,
    ...communityGroupItems,
  ].sort((a, b) => {
    if (a.sortAt && !b.sortAt) return -1;
    if (!a.sortAt && b.sortAt) return 1;
    if (a.sortAt && b.sortAt) return b.sortAt - a.sortAt;
    const itemName = (item: ListItem) => {
      if (item.kind === 'athlete') {
        return `${item.row.profile?.first_name || ''} ${item.row.profile?.last_name || ''}`.trim();
      }
      return item.group.name;
    };
    return itemName(a).localeCompare(itemName(b));
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    if (selection?.kind === 'chatGroup') {
      sendGroupMutation.mutate(messageInput.trim());
    } else if (selection?.kind === 'athlete') {
      sendAthleteMutation.mutate(messageInput.trim());
    }
  };

  const selectAthlete = (id: string) => {
    setSelection({ kind: 'athlete', id });
    setMessageInput('');
  };

  const selectChatGroup = (id: string) => {
    setSelection({ kind: 'chatGroup', id });
    setMessageInput('');
  };

  const selectCommunityGroup = (id: string) => {
    setSelection({ kind: 'communityGroup', id });
    setMessageInput('');
  };

  const listLoading = rowsLoading || chatGroupsLoading || communityGroupsLoading;
  const membersCount = groupMembers?.length ?? selectedChatGroup?.members_count ?? 0;

  const athleteOptionsForDialog = rows.map((r) => ({
    atleta_user_id: r.atleta_user_id,
    profile: r.profile,
  }));

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title="Messaggi"
        description="Chat con i tuoi atleti, i gruppi chat e i gruppi community dei tuoi atleti"
        icon={MessageSquare}
      />

      <div className="grid gap-6 lg:grid-cols-3 lg:h-[calc(100dvh-280px)]">
        {/* Conversations List */}
        <Card className="lg:col-span-1 lg:min-h-0">
          <CardHeader className="pb-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca atleta o gruppo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setCreateGroupOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Nuovo gruppo
            </Button>
            {chatGroupsError && (
              <p className="text-xs text-destructive">
                Impossibile caricare i gruppi chat. Riprova più tardi.
              </p>
            )}
            {communityGroupsError && (
              <p className="text-xs text-destructive">
                Impossibile caricare i gruppi community. Riprova più tardi.
              </p>
            )}
          </CardHeader>
          <CardContent className="p-0 lg:min-h-0">
            <ScrollArea className="max-h-[60dvh] lg:h-[calc(100dvh-440px)]">
              {listLoading ? (
                <div className="p-4 text-center text-muted-foreground">Caricamento...</div>
              ) : listItems.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  Nessuna conversazione trovata
                </div>
              ) : (
                <div className="divide-y">
                  {listItems.map((item) => {
                    if (item.kind === 'chatGroup') {
                      const group = item.group;
                      const preview =
                        group.last_message?.content ||
                        (group.last_message?.attachment_type ? 'Allegato' : null);
                      const isSelected =
                        selection?.kind === 'chatGroup' && selection.id === group.id;
                      return (
                        <button
                          key={`chat-group-${group.id}`}
                          onClick={() => selectChatGroup(group.id)}
                          className={cn(
                            'w-full p-4 text-left hover:bg-accent/50 transition-colors',
                            isSelected && 'bg-accent'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-role-pt/10 text-role-pt overflow-hidden">
                              {group.avatar_url ? (
                                <img
                                  src={group.avatar_url}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Users className="h-5 w-5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium truncate">{group.name}</p>
                                {group.unread_count > 0 && (
                                  <span className="flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-role-pt text-[10px] text-white shrink-0">
                                    {group.unread_count}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">Gruppo chat</p>
                              <p
                                className={cn(
                                  'text-sm truncate',
                                  preview
                                    ? 'text-muted-foreground'
                                    : 'text-muted-foreground italic'
                                )}
                              >
                                {preview || `${group.members_count} atleti`}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    }

                    if (item.kind === 'communityGroup') {
                      const group = item.group;
                      const isSelected =
                        selection?.kind === 'communityGroup' && selection.id === group.id;
                      const ownerLabel =
                        group.owner_user_id === user?.id
                          ? 'Creato da te'
                          : group.owner_name
                            ? `di ${group.owner_name}`
                            : 'dei tuoi atleti';
                      return (
                        <button
                          key={`community-group-${group.id}`}
                          onClick={() => selectCommunityGroup(group.id)}
                          className={cn(
                            'w-full p-4 text-left hover:bg-accent/50 transition-colors',
                            isSelected && 'bg-accent'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-role-pt/10 text-role-pt overflow-hidden">
                              {group.image_url ? (
                                <img
                                  src={group.image_url}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Globe className="h-5 w-5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{group.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Gruppo community · {ownerLabel}
                              </p>
                              <p className="text-sm text-muted-foreground truncate">
                                {group.members_count}{' '}
                                {group.members_count === 1 ? 'membro' : 'membri'}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    }

                    const row = item.row;
                    const isSelected =
                      selection?.kind === 'athlete' && selection.id === row.atleta_user_id;
                    return (
                      <button
                        key={`athlete-${row.atleta_user_id}`}
                        onClick={() => selectAthlete(row.atleta_user_id)}
                        className={cn(
                          'w-full p-4 text-left hover:bg-accent/50 transition-colors',
                          isSelected && 'bg-accent'
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
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat pane */}
        <Card className="lg:col-span-2 flex min-h-0 flex-col">
          {selectedCommunity && selection?.kind === 'communityGroup' && user?.id ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-role-pt/10 text-role-pt overflow-hidden">
                    {selectedCommunity.image_url ? (
                      <img
                        src={selectedCommunity.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Globe className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{selectedCommunity.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Gruppo community · {selectedCommunity.members_count}{' '}
                      {selectedCommunity.members_count === 1 ? 'membro' : 'membri'}
                      {selectedCommunity.owner_name
                        ? ` · ${
                            selectedCommunity.owner_user_id === user.id
                              ? 'Creato da te'
                              : `di ${selectedCommunity.owner_name}`
                          }`
                        : ''}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/pt/groups/${selectedCommunity.id}`)}
                    aria-label="Gestisci gruppo community"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
                <GroupChatPanel
                  groupId={selectedCommunity.id}
                  userId={user.id}
                  myRole={selectedCommunity.my_role}
                />
              </CardContent>
            </>
          ) : selectedChatGroup && selection?.kind === 'chatGroup' ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-role-pt/10 text-role-pt overflow-hidden">
                    {selectedChatGroup.avatar_url ? (
                      <img
                        src={selectedChatGroup.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Users className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{selectedChatGroup.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Gruppo chat · {membersCount}{' '}
                      {membersCount === 1 ? 'atleta' : 'atleti'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setManageGroupOpen(true)}
                    aria-label="Gestisci gruppo"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
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
                      Nessun messaggio. Inizia la conversazione di gruppo!
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
                              {!isOwn && message.senderName && (
                                <p className="text-xs font-medium mb-1 text-role-pt">
                                  {message.senderName}
                                </p>
                              )}
                              {message.attachment_url &&
                                (message.attachment_type === 'video' ? (
                                  <video
                                    src={message.attachment_url}
                                    controls
                                    className="rounded-md max-w-full max-h-64 mb-1"
                                  />
                                ) : (
                                  <img
                                    src={message.attachment_url}
                                    alt="Allegato"
                                    className="rounded-md max-w-full max-h-64 object-cover mb-1 cursor-pointer"
                                    onClick={() =>
                                      window.open(message.attachment_url!, '_blank')
                                    }
                                  />
                                ))}
                              {message.content && <p>{message.content}</p>}
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
                      placeholder="Scrivi un messaggio al gruppo..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      disabled={sendPending}
                    />
                    <Button type="submit" disabled={!messageInput.trim() || sendPending}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </>
          ) : selectedRow && selection?.kind === 'athlete' ? (
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
                              {message.attachment_url &&
                                (message.attachment_type === 'video' ? (
                                  <video
                                    src={message.attachment_url}
                                    controls
                                    className="rounded-md max-w-full max-h-64 mb-1"
                                  />
                                ) : (
                                  <img
                                    src={message.attachment_url}
                                    alt="Allegato"
                                    className="rounded-md max-w-full max-h-64 object-cover mb-1 cursor-pointer"
                                    onClick={() =>
                                      window.open(message.attachment_url!, '_blank')
                                    }
                                  />
                                ))}
                              {message.content && <p>{message.content}</p>}
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
                      placeholder="Scrivi un messaggio..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      disabled={sendPending}
                    />
                    <Button type="submit" disabled={!messageInput.trim() || sendPending}>
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
                <p>
                  Seleziona un atleta, un gruppo chat o un gruppo community per
                  iniziare
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {user?.id && (
        <CreateChatGroupDialog
          open={createGroupOpen}
          onOpenChange={setCreateGroupOpen}
          ptUserId={user.id}
          athletes={athleteOptionsForDialog}
          onCreated={(groupId) => selectChatGroup(groupId)}
        />
      )}

      {selectedChatGroupId && selectedChatGroup && (
        <ManageChatGroupSheet
          open={manageGroupOpen}
          onOpenChange={setManageGroupOpen}
          groupId={selectedChatGroupId}
          groupName={selectedChatGroup.name}
          connectedAthletes={athleteOptionsForDialog}
          onDeleted={() => {
            setSelection(null);
            setManageGroupOpen(false);
          }}
        />
      )}
    </div>
  );
}

export default PTMessagesPage;
