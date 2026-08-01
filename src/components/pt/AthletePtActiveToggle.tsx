import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  checkPtActiveColumnAvailable,
  PtActiveMigrationRequiredError,
  PT_ACTIVE_MIGRATION_HINT,
  setAthletePtActive,
} from '@/lib/api/connections';
import { cn } from '@/lib/utils';

interface Props {
  connectionId: string;
  atletaUserId: string;
  isPtActive: boolean;
  ptUserId?: string;
  className?: string;
}

export function AthletePtActiveToggle({
  connectionId,
  atletaUserId,
  isPtActive,
  ptUserId,
  className,
}: Props) {
  const queryClient = useQueryClient();

  const { data: migrationAvailable = true, isLoading: migrationCheckLoading } = useQuery({
    queryKey: ['pt-active-column-available'],
    queryFn: checkPtActiveColumnAvailable,
    staleTime: 5 * 60 * 1000,
  });

  const toggleDisabled = !migrationAvailable || migrationCheckLoading;

  const mutation = useMutation({
    mutationFn: (next: boolean) => setAthletePtActive(connectionId, next),
    onSuccess: (_data, next) => {
      toast.success(
        next
          ? 'Collaborazione riattivata: l\u2019atleta rivede schede e storico'
          : 'Collaborazione in pausa: l\u2019atleta vede solo la chat',
      );
      queryClient.invalidateQueries({ queryKey: ['pt-athlete-detail', atletaUserId, ptUserId] });
      queryClient.invalidateQueries({ queryKey: ['pt-home-data', ptUserId] });
      queryClient.invalidateQueries({ queryKey: ['pt-connections', ptUserId] });
      queryClient.invalidateQueries({ queryKey: ['pt-connections'] });
      queryClient.invalidateQueries({ queryKey: ['pt-home-data'] });
      queryClient.invalidateQueries({ queryKey: ['atleta-connection'] });
      queryClient.invalidateQueries({ queryKey: ['pt-active-column-available'] });
    },
    onError: (e: Error) => {
      if (e instanceof PtActiveMigrationRequiredError) {
        toast.error(PT_ACTIVE_MIGRATION_HINT, { duration: 8000 });
        queryClient.setQueryData(['pt-active-column-available'], false);
        return;
      }
      toast.error(e.message || 'Errore aggiornamento stato');
    },
  });

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-xl border border-app-border/80 bg-app-muted/30 px-3 py-2.5',
        className,
      )}
    >
      <div className="min-w-0">
        <Label htmlFor="athlete-pt-active" className="text-sm font-medium">
          Stato atleta
        </Label>
        <p className="text-[11px] text-muted-foreground">
          {!migrationAvailable
            ? 'Aggiornamento backend in attesa — toggle temporaneamente disabilitato'
            : isPtActive
              ? 'Visibile come attivo in home e lista'
              : 'Marcato come disattivo dal coach'}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-semibold text-muted-foreground">
          {isPtActive ? 'Attivo' : 'Disattivo'}
        </span>
        <Switch
          id="athlete-pt-active"
          checked={isPtActive}
          disabled={toggleDisabled || mutation.isPending}
          onCheckedChange={(checked) => mutation.mutate(checked)}
        />
      </div>
    </div>
  );
}
