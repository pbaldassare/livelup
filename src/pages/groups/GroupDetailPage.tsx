import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  getGroup,
  getGroupMembers,
  joinGroup,
  leaveGroup,
} from '@/lib/api/groups';
import { GroupShareButton } from '@/components/groups/GroupShareButton';
import { GroupChannelPanel } from '@/components/groups/GroupChatPanel';
import { GroupMembersPanel } from '@/components/groups/GroupMembersPanel';
import { GroupAnnouncementsDialog } from '@/components/groups/GroupAnnouncementsDialog';
import { OfficialBadge } from '@/components/groups/OfficialBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChevronLeft,
  MapPin,
  Users,
  MessageCircle,
  Megaphone,
  Shield,
  LogOut,
  UserPlus,
  Lock,
  Globe,
  Pencil,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { ListSkeleton } from '@/components/skeletons';
import { formatGroupLocation } from '@/lib/groups/location';
import { FollowStarButton } from '@/components/app/FollowStarButton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

type GroupDetailTab = 'chat-group' | 'chat-admin';

function normalizeTab(raw: string | null, isAdmin: boolean): GroupDetailTab {
  if (raw === 'chat-admin' || raw === 'admins') {
    return isAdmin ? 'chat-admin' : 'chat-group';
  }
  return 'chat-group';
}

interface GroupDetailPageProps {
  basePath: string;
}

export function GroupDetailPage({ basePath }: GroupDetailPageProps) {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAtletaSurface = basePath.startsWith('/app');
  const tabFromUrl = searchParams.get('tab');
  const [tab, setTab] = useState<GroupDetailTab>(
    normalizeTab(tabFromUrl, false),
  );
  const [membersOpen, setMembersOpen] = useState(false);
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    if (!tabFromUrl) return;
    if (tabFromUrl === 'members') {
      setMembersOpen(true);
      setTab('chat-group');
      setSearchParams({}, { replace: true });
      return;
    }
    if (tabFromUrl === 'announcements') {
      setAnnouncementsOpen(true);
      setTab('chat-group');
      setSearchParams({}, { replace: true });
      return;
    }
    if (
      tabFromUrl === 'chat-group' ||
      tabFromUrl === 'chat-admin' ||
      tabFromUrl === 'chat' ||
      tabFromUrl === 'admins'
    ) {
      setTab(normalizeTab(tabFromUrl, true));
    }
  }, [tabFromUrl, setSearchParams]);

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

  const onTabChange = (value: string) => {
    const next = normalizeTab(value, isAdmin);
    setTab(next);
    setSearchParams(next === 'chat-group' ? {} : { tab: next }, { replace: true });
  };

  let effectiveTab: GroupDetailTab = normalizeTab(tab, isAdmin);
  if (effectiveTab === 'chat-admin' && !isAdmin) {
    effectiveTab = 'chat-group';
  }

  const isPtApp = basePath.startsWith('/pt/app');
  const tabCols = isAdmin ? 'grid-cols-2' : 'grid-cols-1';
  const chatShellClass = cn(
    'flex min-h-0 flex-col bg-app-background',
    isAtletaSurface || isPtApp ? 'h-full' : 'h-[calc(100vh-6rem)]',
  );
  const openMembers = () => {
    if (!canViewMembers) return;
    setMembersOpen(true);
  };
  const openAnnouncements = () => {
    if (!canUseChat) return;
    setAnnouncementsOpen(true);
  };

  const actionBtnClass =
    'h-12 w-full justify-start rounded-2xl border-border bg-muted/50 font-medium shadow-none';

  const actionGrid = (
    <div className="grid grid-cols-2 gap-2 pt-1">
      {group.is_member && group.my_role !== 'owner' && (
        <Button
          variant="outline"
          className={actionBtnClass}
          onClick={() => leaveMutation.mutate()}
          disabled={leaveMutation.isPending}
        >
          <LogOut className="h-4 w-4 mr-2 shrink-0" />
          Esci
        </Button>
      )}
      <GroupShareButton
        inviteToken={group.invite_token}
        groupName={group.name}
        variant="grid"
      />
      {canViewMembers && (
        <Button variant="outline" className={actionBtnClass} onClick={openMembers}>
          <Users className="h-4 w-4 mr-2 shrink-0" />
          Membri
        </Button>
      )}
      {canUseChat && (
        <Button variant="outline" className={actionBtnClass} onClick={openAnnouncements}>
          <Megaphone className="h-4 w-4 mr-2 shrink-0" />
          Annunci
        </Button>
      )}
      {isAdmin && (
        <Button
          variant="outline"
          className={actionBtnClass}
          onClick={() => navigate(`${basePath}/${group.id}/edit`)}
        >
          <Pencil className="h-4 w-4 mr-2 shrink-0" />
          Modifica
        </Button>
      )}
    </div>
  );

  const groupMeta = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold text-app-foreground flex-1 min-w-0">{group.name}</h2>
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
      {group.disciplines.length > 0 && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="disciplines" className="border-0">
            <AccordionTrigger className="py-2 text-sm hover:no-underline">
              <span>
                Discipline
                <span className="ml-1 font-normal text-app-muted-foreground">
                  ({group.disciplines.length})
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-1">
                {group.disciplines.map((d) => (
                  <Badge
                    key={d.id}
                    variant="outline"
                    className="rounded-full border-border bg-muted/40 text-foreground"
                  >
                    {d.name}
                  </Badge>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
      {group.description && (
        <p className="text-sm text-app-muted-foreground">{group.description}</p>
      )}
      <p className="text-xs text-app-muted-foreground flex items-center gap-1">
        <Users className="h-3 w-3" />
        {group.members_count} {group.members_count === 1 ? 'membro' : 'membri'}
      </p>
    </>
  );

  if (canUseChat) {
    return (
      <div className={chatShellClass}>
        <header className="shrink-0 border-b border-app-border bg-app-card">
          <div className="flex items-center gap-1 px-1 py-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-app-foreground"
              onClick={() => navigate(basePath)}
              aria-label="Indietro"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-app-muted/60"
              onClick={() => setInfoOpen(true)}
            >
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-app-muted">
                {group.image_url ? (
                  <img src={group.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-app-muted-foreground">
                    <Users className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-app-foreground">{group.name}</p>
                <p className="truncate text-[11px] text-app-muted-foreground">
                  {group.members_count} {group.members_count === 1 ? 'membro' : 'membri'} · Info
                </p>
              </div>
            </button>
            {canViewMembers && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={openMembers}
                aria-label="Membri"
              >
                <Users className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={openAnnouncements}
              aria-label="Annunci"
            >
              <Megaphone className="h-4 w-4" />
            </Button>
            <GroupShareButton
              inviteToken={group.invite_token}
              groupName={group.name}
              variant="toolbar"
            />
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => setInfoOpen(true)}
              aria-label="Info gruppo"
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <Tabs
          value={effectiveTab}
          onValueChange={onTabChange}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="shrink-0 px-2 pt-2">
            <TabsList
              className={cn(
                'w-full grid bg-app-muted border border-app-border p-1 h-auto',
                tabCols,
              )}
            >
              <TabsTrigger
                value="chat-group"
                className="gap-1 py-1.5 text-xs data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground"
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                Chat Gruppo
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger
                  value="chat-admin"
                  className="gap-1 py-1.5 text-xs data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground"
                >
                  <Shield className="h-4 w-4 shrink-0" />
                  Chat Admin
                </TabsTrigger>
              )}
            </TabsList>
          </div>
          <TabsContent
            value="chat-group"
            className="mt-0 flex-1 min-h-0 overflow-hidden data-[state=inactive]:hidden"
          >
            {user?.id ? (
              <GroupChannelPanel
                groupId={group.id}
                userId={user.id}
                channel="general"
                myRole={group.my_role}
              />
            ) : null}
          </TabsContent>
          {isAdmin && (
            <TabsContent
              value="chat-admin"
              className="mt-0 flex-1 min-h-0 overflow-hidden data-[state=inactive]:hidden"
            >
              {user?.id ? (
                <GroupChannelPanel
                  groupId={group.id}
                  userId={user.id}
                  channel="admins"
                  myRole={group.my_role}
                />
              ) : null}
            </TabsContent>
          )}
        </Tabs>

        <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto bg-app-card border-app-border">
            <DialogHeader>
              <DialogTitle className="text-app-foreground">Info gruppo</DialogTitle>
              <DialogDescription className="sr-only">Dettagli e azioni del gruppo</DialogDescription>
            </DialogHeader>
            {group.image_url && (
              <img
                src={group.image_url}
                alt=""
                className="aspect-[2.5/1] w-full rounded-lg object-cover"
              />
            )}
            <div className="space-y-3">{groupMeta}</div>
            {isAtletaSurface && (
              <FollowStarButton targetType="group" targetId={group.id} withLabel />
            )}
            {actionGrid}
          </DialogContent>
        </Dialog>

        <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto bg-app-card border-app-border">
            <DialogHeader>
              <DialogTitle className="text-app-foreground">Membri del gruppo</DialogTitle>
              <DialogDescription className="text-app-muted-foreground">
                {group.members_count} {group.members_count === 1 ? 'membro' : 'membri'}
              </DialogDescription>
            </DialogHeader>
            {membersError ? (
              <div className="py-4 text-center space-y-2">
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
                myRole={canUseChat ? group.my_role : null}
                currentUserId={user?.id}
                publicView={!canUseChat}
                isLoading={membersLoading}
              />
            )}
          </DialogContent>
        </Dialog>

        {user?.id && (
          <GroupAnnouncementsDialog
            open={announcementsOpen}
            onOpenChange={setAnnouncementsOpen}
            groupId={group.id}
            userId={user.id}
            myRole={group.my_role}
          />
        )}
      </div>
    );
  }

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
          {groupMeta}
          {isAtletaSurface && (
            <FollowStarButton targetType="group" targetId={group.id} withLabel />
          )}
          {!group.is_member && (
            <Button
              className="w-full bg-app-accent text-black"
              onClick={() => joinMutation.mutate()}
              disabled={joinMutation.isPending}
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Unisciti
            </Button>
          )}
          {actionGrid}
        </div>
        <p className="text-sm text-center text-app-muted-foreground py-6">
          {publicMembersOnly
            ? 'La chat è riservata agli iscritti. Puoi vedere i membri dal pulsante sopra.'
            : 'Unisciti al gruppo per accedere alla chat e ai membri'}
        </p>
      </div>

      <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto bg-app-card border-app-border">
          <DialogHeader>
            <DialogTitle className="text-app-foreground">Membri del gruppo</DialogTitle>
            <DialogDescription className="text-app-muted-foreground">
              {group.members_count}{' '}
              {group.members_count === 1 ? 'membro' : 'membri'}
            </DialogDescription>
          </DialogHeader>
          {membersError ? (
            <div className="py-4 text-center space-y-2">
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
              myRole={canUseChat ? group.my_role : null}
              currentUserId={user?.id}
              publicView={!canUseChat}
              isLoading={membersLoading}
            />
          )}
        </DialogContent>
      </Dialog>

      {user?.id && (
        <GroupAnnouncementsDialog
          open={announcementsOpen}
          onOpenChange={setAnnouncementsOpen}
          groupId={group.id}
          userId={user.id}
          myRole={group.my_role}
        />
      )}
    </div>
  );
}
