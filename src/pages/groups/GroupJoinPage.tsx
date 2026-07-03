import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { getGroupByInviteToken, joinGroup } from '@/lib/api/groups';
import { OfficialBadge } from '@/components/groups/OfficialBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface GroupJoinPageProps {
  basePath: string;
}

export function GroupJoinPage({ basePath }: GroupJoinPageProps) {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['group-invite', token],
    queryFn: () => getGroupByInviteToken(token!),
    enabled: !!token,
  });

  const joinMutation = useMutation({
    mutationFn: () => joinGroup(data!.id!),
    onSuccess: () => {
      toast.success('Benvenuto nel gruppo!');
      navigate(`${basePath}/${data!.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-app-accent" />
      </div>
    );
  }

  if (!data?.found || !data.id) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-app-muted-foreground">Link di invito non valido o scaduto</p>
        <Button variant="outline" onClick={() => navigate(basePath)}>
          Torna ai gruppi
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-background p-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-xl border border-app-border bg-app-card p-6 space-y-4">
        {data.image_url && (
          <img
            src={data.image_url}
            alt=""
            className="w-full aspect-video object-cover rounded-lg"
          />
        )}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-app-foreground">{data.name}</h1>
            {data.is_official && <OfficialBadge />}
            <Badge variant="secondary">Privato</Badge>
          </div>
          {data.location_name && (
            <p className="text-sm text-app-muted-foreground flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {data.location_name}
            </p>
          )}
          <p className="text-xs text-app-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" />
            {data.members_count} membri
          </p>
          {data.description && (
            <p className="text-sm text-app-muted-foreground">{data.description}</p>
          )}
        </div>
        <Button
          className="w-full bg-app-accent text-black"
          onClick={() => joinMutation.mutate()}
          disabled={!user || joinMutation.isPending}
        >
          {joinMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {user ? 'Entra nel gruppo' : 'Accedi per entrare'}
        </Button>
        {!user && (
          <Button variant="outline" className="w-full" onClick={() => navigate('/auth')}>
            Accedi
          </Button>
        )}
      </div>
    </div>
  );
}
