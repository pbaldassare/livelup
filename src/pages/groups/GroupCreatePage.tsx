import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { createGroup } from '@/lib/api/groups';
import { GroupForm } from '@/components/groups/GroupForm';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import type { CreateGroupInput } from '@/types/groups';

interface GroupCreatePageProps {
  basePath: string;
}

export function GroupCreatePage({ basePath }: GroupCreatePageProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const mutation = useMutation({
    mutationFn: (input: CreateGroupInput) => createGroup(user!.id, input),
    onSuccess: (group) => {
      toast.success('Gruppo creato!');
      navigate(`${basePath}/${group.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-app-background pb-24">
      <div className="sticky top-0 z-40 bg-app-background/95 backdrop-blur border-b border-app-border p-4 safe-top">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(basePath)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-app-foreground">Crea gruppo</h1>
        </div>
      </div>
      <div className="p-4 max-w-lg mx-auto">
        <GroupForm
          userId={user.id}
          onSubmit={(input) => mutation.mutateAsync(input)}
          isSubmitting={mutation.isPending}
        />
      </div>
    </div>
  );
}
