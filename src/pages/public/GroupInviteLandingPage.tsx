import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { getGroupByInviteToken, joinGroup } from '@/lib/api/groups';
import {
  consumePendingGroupInvite,
  groupInviteAppJoinPath,
  isGroupInviteToken,
  savePendingGroupInvite,
} from '@/lib/groupInvite';
import { OfficialBadge } from '@/components/groups/OfficialBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, Loader2, Download, UserPlus, LogIn, Lock, Globe } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { toast } from 'sonner';

function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function GroupInviteLandingPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, role, isAuthenticated, isLoading: authLoading, isRoleLoading } = useAuth();
  const validToken = isGroupInviteToken(token) ? token : null;
  const inApp = isStandalonePwa();

  const { data, isLoading } = useQuery({
    queryKey: ['group-invite', validToken],
    queryFn: () => getGroupByInviteToken(validToken!),
    enabled: !!validToken,
  });

  const joinMutation = useMutation({
    mutationFn: () => joinGroup(data!.id!),
    onSuccess: (res) => {
      consumePendingGroupInvite();
      toast.success(res.already_member ? 'Sei già nel gruppo' : 'Benvenuto nel gruppo!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (validToken) savePendingGroupInvite(validToken);
  }, [validToken]);

  useEffect(() => {
    if (!validToken || authLoading || isRoleLoading) return;
    if (!isAuthenticated || !role) return;
    const dest = groupInviteAppJoinPath(role, validToken);
    if (!dest) return;
    consumePendingGroupInvite();
    navigate(dest, { replace: true });
  }, [validToken, authLoading, isRoleLoading, isAuthenticated, role, navigate]);

  const goAuth = (mode?: 'signup') => {
    if (!validToken) return;
    const next = `/g/${validToken}`;
    const params = new URLSearchParams({ next });
    if (mode) params.set('mode', mode);
    navigate(`/auth?${params.toString()}`, {
      state: { from: { pathname: next } },
    });
  };

  if (!validToken) {
    return (
      <div className="min-h-screen bg-background p-8 text-center space-y-4">
        <p className="text-muted-foreground">Link di invito non valido</p>
        <Button variant="outline" onClick={() => navigate('/')}>
          Home
        </Button>
      </div>
    );
  }

  if (authLoading || isRoleLoading || (isAuthenticated && role && role !== 'admin')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data?.found || !data.id) {
    return (
      <div className="min-h-screen bg-background p-8 text-center space-y-4">
        <p className="text-muted-foreground">Link di invito non valido o scaduto</p>
        <Button variant="outline" onClick={() => navigate('/')}>
          Home
        </Button>
      </div>
    );
  }

  const isPrivate = data.visibility === 'private';

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex justify-center">
          <Logo variant="icon" className="w-16 h-16" />
        </div>
        {data.image_url && (
          <img
            src={data.image_url}
            alt=""
            className="w-full aspect-video object-cover rounded-lg"
          />
        )}
        <div className="space-y-2 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <h1 className="text-xl font-bold text-foreground">{data.name}</h1>
            {data.is_official && <OfficialBadge />}
            <Badge variant="secondary" className="gap-1">
              {isPrivate ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
              {isPrivate ? 'Privato' : 'Pubblico'}
            </Badge>
          </div>
          {data.location_name && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <MapPin className="h-4 w-4" />
              {data.location_name}
            </p>
          )}
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Users className="h-3 w-3" />
            {data.members_count} {data.members_count === 1 ? 'membro' : 'membri'}
          </p>
          {data.description && (
            <p className="text-sm text-muted-foreground">{data.description}</p>
          )}
        </div>

        {user ? (
          <Button
            className="w-full"
            onClick={() => joinMutation.mutate()}
            disabled={joinMutation.isPending || !data.id}
          >
            {joinMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Entra nel gruppo
          </Button>
        ) : (
          <>
            <Button className="w-full gap-2" onClick={() => goAuth('signup')}>
              <UserPlus className="h-4 w-4" />
              Registrati per iscriverti
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={() => goAuth()}>
              <LogIn className="h-4 w-4" />
              Accedi
            </Button>
            {!inApp && (
              <Button
                variant="secondary"
                className="w-full gap-2"
                onClick={() =>
                  navigate(`/install?next=${encodeURIComponent(`/g/${validToken}`)}`)
                }
              >
                <Download className="h-4 w-4" />
                Scarica l&apos;app
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
