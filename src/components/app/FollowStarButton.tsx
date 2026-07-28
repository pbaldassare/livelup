import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  followQueryKeys,
  isFollowing as checkIsFollowing,
  toggleFollow,
  type FollowTargetType,
} from '@/lib/api/follows';

// =====================================================
// FollowStarButton — stella per salvare nei Salvati
// eventi/corsi/gruppi/PT/professionisti SENZA iscriversi/collegarsi.
// Nessuna notifica generata: solo un toast locale di conferma.
// =====================================================

interface FollowStarButtonProps {
  targetType: FollowTargetType;
  targetId: string;
  className?: string;
  size?: 'sm' | 'md';
  /** Mostra anche l'etichetta testuale accanto alla stella */
  withLabel?: boolean;
}

const LABELS: Record<FollowTargetType, { on: string; off: string }> = {
  event: { on: 'Evento salvato', off: 'Evento rimosso dai salvati' },
  course: { on: 'Corso salvato', off: 'Corso rimosso dai salvati' },
  group: { on: 'Gruppo salvato', off: 'Gruppo rimosso dai salvati' },
  pt: { on: 'PT salvato', off: 'PT rimosso dai salvati' },
  professional: { on: 'Professionista salvato', off: 'Rimosso dai salvati' },
};

export function FollowStarButton({
  targetType,
  targetId,
  className,
  size = 'md',
  withLabel = false,
}: FollowStarButtonProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: following = false } = useQuery({
    queryKey: user?.id ? followQueryKeys.isFollowing(user.id, targetType, targetId) : ['atleta-follow-anon'],
    queryFn: () => checkIsFollowing(user!.id, targetType, targetId),
    enabled: !!user?.id && !!targetId,
  });

  const mutation = useMutation({
    mutationFn: () => toggleFollow(user!.id, targetType, targetId),
    onSuccess: (nowFollowing) => {
      queryClient.setQueryData(followQueryKeys.isFollowing(user!.id, targetType, targetId), nowFollowing);
      queryClient.invalidateQueries({ queryKey: followQueryKeys.list(user!.id) });
      const labels = LABELS[targetType];
      toast.success(nowFollowing ? labels.on : labels.off);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Errore salvati');
    },
  });

  if (!user?.id) return null;

  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <button
      type="button"
      aria-label={following ? 'Rimuovi dai salvati' : 'Aggiungi ai salvati'}
      aria-pressed={following}
      disabled={mutation.isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        mutation.mutate();
      }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full transition-colors disabled:opacity-60',
        withLabel
          ? 'px-3 py-1.5 border border-app-border bg-app-card hover:border-app-accent/50 text-xs font-medium'
          : 'p-1.5 hover:bg-app-muted/60',
        className,
      )}
    >
      <Star
        className={cn(
          iconSize,
          following ? 'fill-app-accent text-app-accent' : 'text-app-muted-foreground',
        )}
      />
      {withLabel && (
        <span className={following ? 'text-app-accent' : 'text-app-foreground'}>
          {following ? 'Salvato' : 'Salva'}
        </span>
      )}
    </button>
  );
}

export default FollowStarButton;
