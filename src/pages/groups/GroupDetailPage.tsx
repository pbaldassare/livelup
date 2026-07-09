import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { ListSkeleton } from '@/components/skeletons';

interface GroupDetailPageProps {
  basePath: string;
}

export function GroupDetailPage({ basePath }: GroupDetailPageProps) {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('chat');

  const { data: group, isLoading } = useQuery({
    queryKey: ['group', groupId, user?.id],
    queryFn: () => getGroup(groupId!, user?.id),
    enabled: !!groupId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: () => getGroupMembers(groupId!),
    enabled: !!groupId && !!group?.is_member,
  });

  const joinMutation = useMutation({
    mutationFn: () => joinGroup(groupId!),
    onSuccess: () => {
      toast.success('Sei entrato nel gruppo!');
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
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

          {group.location_name && (
            <p className="text-sm text-app-muted-foreground flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {group.location_name}
            </p>
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

          <p className="text-xs text-app-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" />
            {group.members_count} membri
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {!group.is_member && (
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
          </div>
        </div>

        {group.is_member ? (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="chat" className="gap-1">
                <MessageCircle className="h-4 w-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="members" className="gap-1">
                <Users className="h-4 w-4" />
                Membri
              </TabsTrigger>
            </TabsList>
            <TabsContent value="chat">
              <GroupChatPanel
                groupId={group.id}
                userId={user!.id}
                myRole={group.my_role}
              />
            </TabsContent>
            <TabsContent value="members">
              <GroupMembersPanel
                groupId={group.id}
                members={members}
                myRole={group.my_role}
                currentUserId={user!.id}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <p className="text-sm text-center text-app-muted-foreground py-6">
            Unisciti al gruppo per accedere alla chat e ai membri
          </p>
        )}
      </div>
    </div>
  );
}
