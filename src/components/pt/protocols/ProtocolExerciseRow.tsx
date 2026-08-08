// =====================================================
// Riga esercizio protocollo — layout mobile-first
// =====================================================

import type { ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LoadField } from '@/components/pt/LoadField';
import {
  ProtocolExerciseCombobox,
  type ProtocolExercisePickerProps,
} from '@/components/pt/protocols/ProtocolExerciseCombobox';
import { ProtocolTargetField } from '@/components/pt/protocols/ProtocolTargetField';
import type { ProtocolExerciseTarget } from '@/lib/protocols/exerciseTarget';
import type { LoadFields } from '@/lib/loadPrescription';
import { cn } from '@/lib/utils';

interface ProtocolExerciseRowProps extends ProtocolExercisePickerProps {
  exerciseName: string;
  onExerciseChange: (opt: { id?: string; name: string }) => void;
  target: Pick<ProtocolExerciseTarget, 'mode' | 'reps' | 'duration_seconds'>;
  onTargetChange: (next: Required<ProtocolExerciseTarget>) => void;
  load: Partial<LoadFields>;
  onLoadChange: (next: LoadFields) => void;
  onRemove: () => void;
  canRemove: boolean;
  className?: string;
  children?: ReactNode;
  autoOpen?: boolean;
  onAutoOpenConsumed?: () => void;
}

export function ProtocolExerciseRow({
  exerciseName,
  onExerciseChange,
  target,
  onTargetChange,
  load,
  onLoadChange,
  onRemove,
  canRemove,
  className,
  children,
  workoutExerciseOptions,
  favoriteExerciseOptions,
  mineExerciseOptions,
  globalExerciseOptions,
  autoOpen,
  onAutoOpenConsumed,
}: ProtocolExerciseRowProps) {
  return (
    <div
      className={cn(
        'rounded-md border border-dashed bg-muted/20 p-2.5 space-y-2.5',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-0.5">
          <Label className="text-[10px] text-muted-foreground">Esercizio</Label>
          <ProtocolExerciseCombobox
            value={exerciseName}
            workoutExerciseOptions={workoutExerciseOptions}
            favoriteExerciseOptions={favoriteExerciseOptions}
            mineExerciseOptions={mineExerciseOptions}
            globalExerciseOptions={globalExerciseOptions}
            onChange={onExerciseChange}
            autoOpen={autoOpen}
            onAutoOpenConsumed={onAutoOpenConsumed}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mt-5 h-9 w-9 shrink-0 text-destructive hover:text-destructive"
          disabled={!canRemove}
          onClick={onRemove}
          aria-label="Elimina esercizio"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <ProtocolTargetField value={target} label="Target" onChange={onTargetChange} />
        <LoadField value={load} onChange={onLoadChange} />
      </div>

      {children}
    </div>
  );
}
