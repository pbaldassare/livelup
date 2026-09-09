import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Flame, Snowflake, Trash2 } from 'lucide-react';
import { RoutineExercisePicker } from '@/components/pt/RoutineExercisePicker';
import {
  addAssignedRoutineExercise,
  clearAssignedRoutinePhase,
  listAssignedRoutineExercises,
  removeAssignedRoutineExercise,
  replaceAssignedRoutineExercise,
  type AssignedRoutinePhase,
  type AssignedRoutineRow,
} from '@/lib/api/assignedRoutines';
import { canAddRoutineExercise, MAX_ROUTINE_EXERCISES } from '@/lib/pt/routineExercises';

type Props = {
  workoutId: string;
};

function PhaseList({
  workoutId,
  phase,
  rows,
  busy,
  onChanged,
}: {
  workoutId: string;
  phase: AssignedRoutinePhase;
  rows: AssignedRoutineRow[];
  busy: boolean;
  onChanged: () => void;
}) {
  const ids = rows.map((r) => r.exercise_id);

  return (
    <div className="space-y-2">
      {rows.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Nessun esercizio. Aggiungine uno o più.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((row, idx) => (
            <li
              key={row.id}
              className="flex items-center gap-1.5 rounded-md border border-dashed bg-background p-1.5"
            >
              <span className="w-5 shrink-0 text-center text-[11px] font-semibold text-muted-foreground">
                {idx + 1}.
              </span>
              <div className="min-w-0 flex-1">
                <RoutineExercisePicker
                  selectedId={row.exercise_id}
                  selectedName={row.name}
                  disabled={busy}
                  excludeIds={ids.filter((id) => id !== row.exercise_id)}
                  onPick={(nextId) => {
                    if (!canAddRoutineExercise(ids.filter((id) => id !== row.exercise_id), nextId)) {
                      toast.error('Esercizio già in elenco');
                      return;
                    }
                    replaceAssignedRoutineExercise(row.id, nextId)
                      .then(onChanged)
                      .catch((e: Error) => toast.error(e.message || 'Errore'));
                  }}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                disabled={busy}
                aria-label="Elimina esercizio"
                onClick={() => {
                  removeAssignedRoutineExercise(row.id)
                    .then(onChanged)
                    .catch((e: Error) => toast.error(e.message || 'Errore'));
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <RoutineExercisePicker
        variant="add"
        selectedId={null}
        disabled={busy || rows.length >= MAX_ROUTINE_EXERCISES}
        excludeIds={ids}
        onPick={(id) => {
          addAssignedRoutineExercise(workoutId, phase, id, rows)
            .then(onChanged)
            .catch((e: Error) => toast.error(e.message || 'Errore'));
        }}
      />
    </div>
  );
}

export function WorkoutRoutineLinks({ workoutId }: Props) {
  const queryClient = useQueryClient();
  const queryKey = ['pt-assigned-routines', workoutId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const [warmup, cooldown] = await Promise.all([
        listAssignedRoutineExercises(workoutId, 'warmup'),
        listAssignedRoutineExercises(workoutId, 'cooldown'),
      ]);
      return { warmup, cooldown };
    },
    enabled: !!workoutId,
  });

  const warmup = data?.warmup ?? [];
  const cooldown = data?.cooldown ?? [];

  const [includeWarmup, setIncludeWarmup] = useState(false);
  const [includeCooldown, setIncludeCooldown] = useState(false);

  useEffect(() => {
    if (warmup.length > 0) setIncludeWarmup(true);
  }, [warmup.length]);

  useEffect(() => {
    if (cooldown.length > 0) setIncludeCooldown(true);
  }, [cooldown.length]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ['sheet-exercises', 'workout', workoutId] });
    queryClient.invalidateQueries({ queryKey: ['sheet-exercise-options', 'workout', workoutId] });
    toast.success('Collegamento aggiornato');
  };

  const clearMutation = useMutation({
    mutationFn: (phase: AssignedRoutinePhase) => clearAssignedRoutinePhase(workoutId, phase),
    onSuccess: (_, phase) => {
      if (phase === 'warmup') setIncludeWarmup(false);
      else setIncludeCooldown(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message || 'Errore'),
  });

  const busy = isLoading || clearMutation.isPending;

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs font-medium text-foreground">Riscaldamento e stretching</p>
      <p className="text-[11px] text-muted-foreground leading-snug">
        Valgono solo per questa copia assegnata. Puoi aggiungere e togliere esercizi: l&apos;atleta
        li vede come fasi saltabili, fuori dal riepilogo sessione.
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            Includi riscaldamento
          </Label>
          <Switch
            checked={includeWarmup}
            disabled={busy}
            onCheckedChange={(v) => {
              if (v) setIncludeWarmup(true);
              else clearMutation.mutate('warmup');
            }}
          />
        </div>
        {includeWarmup && (
          <PhaseList
            workoutId={workoutId}
            phase="warmup"
            rows={warmup}
            busy={busy}
            onChanged={refresh}
          />
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs flex items-center gap-1.5">
            <Snowflake className="h-3.5 w-3.5 text-sky-500" />
            Includi stretching
          </Label>
          <Switch
            checked={includeCooldown}
            disabled={busy}
            onCheckedChange={(v) => {
              if (v) setIncludeCooldown(true);
              else clearMutation.mutate('cooldown');
            }}
          />
        </div>
        {includeCooldown && (
          <PhaseList
            workoutId={workoutId}
            phase="cooldown"
            rows={cooldown}
            busy={busy}
            onChanged={refresh}
          />
        )}
      </div>
    </div>
  );
}
