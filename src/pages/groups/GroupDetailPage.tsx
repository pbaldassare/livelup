import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  getGroup,
  getGroupMembers,
  joinGroup,
  leaveGroup,
  getGroupInviteUrl,
} from '@/lib/api/groups';
import { GroupChatPanel } from '@/components/groups/GroupChatPanel';
import { GroupMembersPanel } from '@/components/groups/GroupMembersPanel';
import { OfficialBadge } from '@/components/groups/OfficialBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChevronLeft,
  MapPin,
  Users,
  MessageCircle,
  Link2,
  LogOut,
  UserPlus,
  Lock,
  Globe,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { ListSkeleton } from '@/components/skeletons';
import { formatGroupLocation } from '@/lib/groups/location';

interface GroupDetailPageProps {
  basePath: string;
}

export function GroupDetailPage({ basePath }: GroupDetailPageProps) {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tabFromUrl = searchParams.get('tab');
  const [tab, setTab] = useState(tabFromUrl === 'members' ? 'members' : 'chat');

  useEffect(() => {
    if (tabFromUrl === 'members' || tabFromUrl === 'chat') {
      setTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const { data: group, isLoading } = useQuery({
    queryKey: ['group', groupId, user?.id],
    queryFn: () => getGroup(groupId!, user?.id),
    enabled: !!groupId,
  });

  const canViewMembers =
    !!group &&
    (group.is_member ||
      !!group.is_coach_access ||
      (group.visibility === 'public' && group.status === 'active'));

  const {
    data: members = [],
    isError: membersError,
    isFetching: membersLoading,
    refetch: refetchMembers,
  } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: () => getGroupMembers(groupId!),
    enabled: !!groupId && canViewMembers,
  });

  useEffect(() => {
    if (membersError) {
      toast.error('Impossibile caricare i membri del gruppo. Riprova.');
    }
  }, [membersError]);

  const joinMutation = useMutation({
    mutationFn: () => joinGroup(groupId!),
    onSuccess: () => {
      toast.success('Sei entrato nel gruppo!');
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const leaveMutation = useMutation({
    mutationFn: () => leaveGroup(groupId!, user!.id),
    onSuccess: () => {
      toast.success('Hai lasciato il gruppo');
      navigate(basePath);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyInviteLink = () => {
    if (!group?.invite_token) return;
    const url = getGroupInviteUrl(group.invite_token, basePath);
    navigator.clipboard.writeText(url);
    toast.success('Link copiato negli appunti');
  };

  const onTabChange = (value: string) => {
    setTab(value);
    setSearchParams(value === 'chat' ? {} : { tab: value }, { replace: true });
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <ListSkeleton count={2} type="chat" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-8 text-center text-app-muted-foreground">
        Gruppo non trovato
      </div>
    );
  }

  const isAdmin = group.my_role === 'owner' || group.my_role === 'admin';
  const canUseChat = !!group.is_member || !!group.is_coach_access;
  const location = formatGroupLocation(group);
  const publicMembersOnly = !canUseChat && canViewMembers;

  // Non-members on public groups: default to members tab if chat unavailable
  const effectiveTab =
    !canUseChat && tab === 'chat' && canViewMembers ? 'members' : tab;

  return (
    <div className="min-h-screen bg-app-background pb-24">
      <div className="relative">
        <div className="aspect-[2.5/1] bg-app-muted">
          {group.image_url ? (
            <img src={group.image_url} alt="" className="w-full h-full object-cover" />
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 bg-black/40 text-white"
          onClick={() => navigate(basePath)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-4 space-y-4 -mt-6 relative z-10">
        <div className="rounded-xl border border-app-border bg-app-card p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-app-foreground">{group.name}</h1>
            {group.is_official && <OfficialBadge />}
            {group.visibility === 'private' ? (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" /> Privato
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Globe className="h-3 w-3" /> Pubblico
              </Badge>
            )}
          </div>

          {location.primary && (
            <div className="text-sm text-app-muted-foreground">
              <p className="flex items-center gap-1">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{location.primary}</span>
              </p>
              {location.secondary && (
                <p className="pl-5 text-xs mt-0.5">{location.secondary}</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-1">
            {group.disciplines.map((d) => (
              <Badge
                key={d.id}
                variant="outline"
                className="border-app-accent/30 text-app-accent bg-app-accent/10"
              >
                {d.name}
              </Badge>
            ))}
          </div>

          {group.description && (
            <p className="text-sm text-app-muted-foreground">{group.description}</p>
          )}

          <button
            type="button"
            className="text-xs text-app-muted-foreground flex items-center gap-1 hover:text-app-accent transition-colors"
            onClick={() => canViewMembers && onTabChange('members')}
            disabled={!canViewMembers}
          >
            <Users className="h-3 w-3" />
            {group.members_count}{' '}
            {group.members_count === 1 ? 'membro' : 'membri'}
            {canViewMembers && (
              <span className="text-app-accent ml-1">· Vedi lista</span>
            )}
          </button>

          <div className="flex flex-wrap gap-2 pt-1">
            {!group.is_member && !group.is_coach_access && (
              <Button
                className="bg-app-accent text-black"
                onClick={() => joinMutation.mutate()}
                disabled={joinMutation.isPending}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Unisciti
              </Button>
            )}
            {group.is_member && group.my_role !== 'owner' && (
              <Button
                variant="outline"
                onClick={() => leaveMutation.mutate()}
                disabled={leaveMutation.isPending}
              >
                <LogOut className="h-4 w-4 mr-1" />
                Esci
              </Button>
            )}
            {isAdmin && group.visibility === 'private' && (
              <Button variant="outline" onClick={copyInviteLink}>
                <Link2 className="h-4 w-4 mr-1" />
                Copia link invito
              </Button>
            )}
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => navigate(`${basePath}/${group.id}/edit`)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Modifica
              </Button>
            )}
          </div>
        </div>

        {canUseChat ? (
          <Tabs value={effectiveTab} onValueChange={onTabChange}>
            <TabsList className="w-full grid grid-cols-2 bg-app-muted border border-app-border p-1">
              <TabsTrigger
                value="chat"
                className="gap-1 data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground"
              >
                <MessageCircle className="h-4 w-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger
                value="members"
                className="gap-1 data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground"
              >
                <Users className="h-4 w-4" />
                Membri
              </TabsTrigger>
            </TabsList>
            <TabsContent value="chat">
              {user?.id ? (
                <GroupChatPanel
                  groupId={group.id}
                  userId={user.id}
                  myRole={group.my_role}
                />
              ) : null}
            </TabsContent>
            <TabsContent value="members">
              {membersError ? (
                <div className="py-6 text-center space-y-2">
                  <p className="text-sm text-app-muted-foreground">
                    Impossibile caricare i membri del gruppo.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => refetchMembers()}>
                    Riprova
                  </Button>
                </div>
              ) : (
                <GroupMembersPanel
                  groupId={group.id}
                  members={members}
                  myRole={group.my_role}
                  currentUserId={user?.id}
                  isLoading={membersLoading}
                />
              )}
            </TabsContent>
          </Tabs>
        ) : canViewMembers ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-app-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Membri
            </h2>
            {membersError ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-sm text-app-muted-foreground">
                  Impossibile caricare i membri del gruppo.
                </p>
                <Button variant="outline" size="sm" onClick={() => refetchMembers()}>
                  Riprova
                </Button>
              </div>
            ) : (
              <GroupMembersPanel
                groupId={group.id}
                members={members}
                myRole={null}
                currentUserId={user?.id}
                publicView
                isLoading={membersLoading}
              />
            )}
          </div>
        ) : (
          <p className="text-sm text-center text-app-muted-foreground py-6">
            Unisciti al gruppo per accedere alla chat e ai membri
          </p>
        )}

        {publicMembersOnly && (
          <p className="text-xs text-center text-app-muted-foreground">
            La chat è riservata agli iscritti.
          </p>
        )}
      </div>
    </div>
  );
}
