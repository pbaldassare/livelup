import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { getGroup, saveGroupEdit } from '@/lib/api/groups';
import { GroupForm } from '@/components/groups/GroupForm';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import type { GroupFormInput } from '@/types/groups';
import { ListSkeleton } from '@/components/skeletons';

interface GroupEditPageProps {
  basePath: string;
}

export function GroupEditPage({ basePath }: GroupEditPageProps) {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: group, isLoading } = useQuery({
    queryKey: ['group', groupId, user?.id],
    queryFn: () => getGroup(groupId!, user?.id),
    enabled: !!groupId && !!user?.id,
  });

  const mutation = useMutation({
    mutationFn: (input: GroupFormInput) => saveGroupEdit(groupId!, input),
    onSuccess: () => {
      toast.success('Gruppo aggiornato');
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      queryClient.invalidateQueries({ queryKey: ['search-groups'] });
      navigate(`${basePath}/${groupId}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-app-background p-4">
        <ListSkeleton count={2} type="chat" />
      </div>
    );
  }

  const isAdmin = group?.my_role === 'owner' || group?.my_role === 'admin';

  if (!group || !isAdmin) {
    return (
      <div className="min-h-screen bg-app-background p-8 text-center">
        <p className="text-app-muted-foreground mb-4">
          {!group ? 'Gruppo non trovato' : 'Non hai i permessi per modificare questo gruppo'}
        </p>
        <Button variant="outline" onClick={() => navigate(basePath)}>
          Torna ai gruppi
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-background pb-24">
      <div className="sticky top-0 z-40 bg-app-background/95 backdrop-blur border-b border-app-border p-4 safe-top">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`${basePath}/${groupId}`)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-app-foreground">Modifica gruppo</h1>
        </div>
      </div>
      <div className="p-4 max-w-lg mx-auto">
        <GroupForm
          userId={user.id}
          mode="edit"
          groupId={group.id}
          initialValues={{
            name: group.name,
            description: group.description ?? '',
            imageUrl: group.image_url,
            placeLabel: group.place_label ?? '',
            addressLine: group.address_line ?? '',
            locationName: group.location_name ?? '',
            latitude: group.latitude,
            longitude: group.longitude,
            visibility: group.visibility,
            disciplineIds: group.disciplines.map((d) => d.id),
          }}
          onSubmit={async (input) => {
            await mutation.mutateAsync(input);
          }}
          isSubmitting={mutation.isPending}
        />
      </div>
    </div>
  );
}
