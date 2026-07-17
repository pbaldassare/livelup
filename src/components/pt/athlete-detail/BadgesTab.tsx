import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Award, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface Props {
  atletaUserId: string;
}

type AssignedBadgeRow = {
  id: string;
  earned_at: string;
  badge_id: string;
  badges: {
    id: string;
    name: string;
    description: string;
    icon_url: string | null;
    points: number;
    category: string;
  } | null;
};

function BadgeIcon({ iconUrl }: { iconUrl: string | null }) {
  if (!iconUrl) {
    return <Award className="h-5 w-5 text-warning" />;
  }
  if (iconUrl.startsWith('http')) {
    return <img src={iconUrl} alt="" className="h-8 w-8 object-contain" />;
  }
  return <span className="text-2xl leading-none">{iconUrl}</span>;
}

export function BadgesTab({ atletaUserId }: Props) {
  const queryClient = useQueryClient();
  const [selectedBadgeId, setSelectedBadgeId] = useState('');
  const [badgeToRemove, setBadgeToRemove] = useState<AssignedBadgeRow | null>(null);

  const { data: badges = [] } = useQuery({
    queryKey: ['all-badges'],
    queryFn: async () => {
      const { data, error } = await supabase.from('badges').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const { data: assignedBadges = [], isLoading } = useQuery({
    queryKey: ['athlete-badges', atletaUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('atleta_badges')
        .select('id, earned_at, badge_id, badges(id, name, description, icon_url, points, category)')
        .eq('atleta_user_id', atletaUserId)
        .order('earned_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AssignedBadgeRow[];
    },
    enabled: !!atletaUserId,
  });

  const earnedBadgeIds = assignedBadges.map((row) => row.badge_id);
  const unassignedBadges = badges.filter((b) => !earnedBadgeIds.includes(b.id));

  const assignBadgeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBadgeId) throw new Error('Missing badge');
      const { error } = await supabase.from('atleta_badges').insert({
        atleta_user_id: atletaUserId,
        badge_id: selectedBadgeId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['athlete-badges', atletaUserId] });
      toast.success('Badge assegnato!');
      setSelectedBadgeId('');
    },
    onError: () => toast.error('Errore nell\'assegnazione del badge'),
  });

  const removeBadgeMutation = useMutation({
    mutationFn: async (atletaBadgeId: string) => {
      const { error } = await supabase.from('atleta_badges').delete().eq('id', atletaBadgeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['athlete-badges', atletaUserId] });
      toast.success('Badge rimosso');
      setBadgeToRemove(null);
    },
    onError: () => toast.error('Errore nella rimozione del badge'),
  });

  return (
    <div className="space-y-6">
      <SectionCard
        title="Badge assegnati"
        subtitle="Badge attualmente associati all'atleta"
        icon={Award}
        iconColor="yellow"
      >
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Caricamento...</p>
        ) : assignedBadges.length === 0 ? (
          <EmptyState
            variant="compact"
            icon={Award}
            title="Nessun badge assegnato"
            description="Assegna un badge per premiare i risultati del tuo atleta."
          />
        ) : (
          <div className="space-y-2">
            {assignedBadges.map((row) => {
              const badge = row.badges;
              if (!badge) return null;

              return (
                <div
                  key={row.id}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/10">
                    <BadgeIcon iconUrl={badge.icon_url} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-tight">{badge.name}</p>
                    {badge.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{badge.description}</p>
                    )}
                    {row.earned_at && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Assegnato il {format(new Date(row.earned_at), 'd MMMM yyyy', { locale: it })}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() => setBadgeToRemove(row)}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Rimuovi
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Assegna Badge"
        subtitle="Premia i risultati del tuo atleta"
        icon={Award}
        iconColor="green"
      >
        {unassignedBadges.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Tutti i badge disponibili sono già stati assegnati.
          </p>
        ) : (
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Select value={selectedBadgeId} onValueChange={setSelectedBadgeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona badge..." />
                </SelectTrigger>
                <SelectContent>
                  {unassignedBadges.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} - {b.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => assignBadgeMutation.mutate()}
              disabled={!selectedBadgeId || assignBadgeMutation.isPending}
            >
              <Award className="h-4 w-4 mr-2" />
              Assegna
            </Button>
          </div>
        )}
      </SectionCard>

      <AlertDialog open={!!badgeToRemove} onOpenChange={(open) => !open && setBadgeToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovere questo badge?</AlertDialogTitle>
            <AlertDialogDescription>
              {badgeToRemove?.badges
                ? `Il badge "${badgeToRemove.badges.name}" verrà rimosso dall'atleta.`
                : 'Il badge verrà rimosso dall\'atleta.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => badgeToRemove && removeBadgeMutation.mutate(badgeToRemove.id)}
              disabled={removeBadgeMutation.isPending}
            >
              Rimuovi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
