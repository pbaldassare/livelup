import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  setAthleteTrainingModality,
  TrainingModalityMigrationRequiredError,
  TRAINING_MODALITY_MIGRATION_HINT,
} from '@/lib/api/connections';
import {
  TRAINING_MODALITIES,
  TRAINING_MODALITY_LABELS,
  normalizeTrainingModality,
  type TrainingModality,
} from '@/lib/trainingModality';
import { cn } from '@/lib/utils';

interface Props {
  connectionId: string;
  atletaUserId: string;
  modality?: string | null;
  ptUserId?: string;
  className?: string;
}

export function AthleteTrainingModalitySelect({
  connectionId,
  atletaUserId,
  modality,
  ptUserId,
  className,
}: Props) {
  const queryClient = useQueryClient();
  const value = normalizeTrainingModality(modality);

  const mutation = useMutation({
    mutationFn: (next: TrainingModality) => setAthleteTrainingModality(connectionId, next),
    onSuccess: (_data, next) => {
      toast.success(`Modalità: ${TRAINING_MODALITY_LABELS[next]}`);
      queryClient.invalidateQueries({ queryKey: ['pt-athlete-detail', atletaUserId, ptUserId] });
      queryClient.invalidateQueries({ queryKey: ['pt-connections', ptUserId] });
      queryClient.invalidateQueries({ queryKey: ['pt-transfer-my-athletes'] });
      queryClient.invalidateQueries({ queryKey: ['pt-home-data', ptUserId] });
    },
    onError: (e: Error) => {
      if (e instanceof TrainingModalityMigrationRequiredError) {
        toast.error(TRAINING_MODALITY_MIGRATION_HINT, { duration: 8000 });
        return;
      }
      toast.error(e.message || 'Errore aggiornamento modalità');
    },
  });

  return (
    <div
      className={cn(
        'rounded-xl border border-app-border/80 bg-app-muted/30 px-3 py-2.5 space-y-1.5',
        className,
      )}
    >
      <Label htmlFor="athlete-training-modality" className="text-sm font-medium">
        Modalità allenamento
      </Label>
      <Select
        value={value}
        disabled={mutation.isPending}
        onValueChange={(v) => mutation.mutate(v as TrainingModality)}
      >
        <SelectTrigger
          id="athlete-training-modality"
          className="bg-app-background border-app-border"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TRAINING_MODALITIES.map((m) => (
            <SelectItem key={m} value={m}>
              {TRAINING_MODALITY_LABELS[m]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[11px] text-muted-foreground">
        In presenza, online o mix — usata in lista e in Assegna atleta
      </p>
    </div>
  );
}
