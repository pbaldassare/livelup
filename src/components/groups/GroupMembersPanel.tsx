import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { removeMember, setMemberRole } from '@/lib/api/groups';
import type { GroupMemberRole } from '@/types/groups';
import { Crown, MoreVertical, Shield, User } from 'lucide-react';
import { toast } from 'sonner';

interface Member {
  id: string;
  user_id: string;
  role: GroupMemberRole;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    email: string | null;
  } | null;
}

interface GroupMembersPanelProps {
  groupId: string;
  members: Member[];
  myRole?: GroupMemberRole | null;
  currentUserId?: string | null;
  /** Visitatori (non iscritti): niente email / azioni di gestione */
  publicView?: boolean;
  isLoading?: boolean;
}

function roleLabel(role: GroupMemberRole) {
  if (role === 'owner') return 'Proprietario';
  if (role === 'admin') return 'Admin';
  return 'Membro';
}

function roleIcon(role: GroupMemberRole) {
  if (role === 'owner') return Crown;
  if (role === 'admin') return Shield;
  return User;
}

export function GroupMembersPanel({
  groupId,
  members,
  myRole,
  currentUserId,
  publicView = false,
  isLoading = false,
}: GroupMembersPanelProps) {
  const queryClient = useQueryClient();
  const canManage = !publicView && (myRole === 'owner' || myRole === 'admin');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
    queryClient.invalidateQueries({ queryKey: ['group', groupId] });
  };

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: GroupMemberRole }) =>
      setMemberRole(groupId, userId, role),
    onSuccess: () => {
      toast.success('Ruolo aggiornato');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeMember(groupId, userId),
    onSuccess: () => {
      toast.success('Membro rimosso');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (members.length === 0) {
    return (
      <p className="text-sm text-center text-app-muted-foreground py-6">
        {isLoading ? 'Caricamento membri…' : 'Nessun membro da mostrare'}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {publicView && (
        <p className="text-xs text-app-muted-foreground px-1 pb-1">
          Lista membri del gruppo pubblico. Unisciti per chattare.
        </p>
      )}
      {members.map((m) => {
        const name =
          [m.profiles?.first_name, m.profiles?.last_name].filter(Boolean).join(' ') ||
          (!publicView ? m.profiles?.email : null) ||
          'Utente';
        const initials = name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2);
        const RoleIcon = roleIcon(m.role);
        const isSelf = !!currentUserId && m.user_id === currentUserId;
        const isOwner = m.role === 'owner';

        return (
          <div
            key={m.id}
            className="flex items-center gap-3 rounded-lg border border-app-border p-3"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={m.profiles?.avatar_url || undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-app-foreground truncate">
                {name}
                {isSelf && (
                  <span className="text-app-muted-foreground font-normal"> (tu)</span>
                )}
              </p>
              <Badge
                variant="outline"
                className="text-[10px] gap-1 mt-0.5 border-app-border text-app-foreground"
              >
                <RoleIcon className="h-3 w-3" />
                {roleLabel(m.role)}
              </Badge>
            </div>
            {canManage && !isOwner && !isSelf && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {m.role === 'member' && myRole === 'owner' && (
                    <DropdownMenuItem
                      onClick={() =>
                        roleMutation.mutate({ userId: m.user_id, role: 'admin' })
                      }
                    >
                      Promuovi ad admin
                    </DropdownMenuItem>
                  )}
                  {m.role === 'admin' && myRole === 'owner' && (
                    <DropdownMenuItem
                      onClick={() =>
                        roleMutation.mutate({ userId: m.user_id, role: 'member' })
                      }
                    >
                      Rimuovi da admin
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => removeMutation.mutate(m.user_id)}
                  >
                    Rimuovi dal gruppo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      })}
    </div>
  );
}
