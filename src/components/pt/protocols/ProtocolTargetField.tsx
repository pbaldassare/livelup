// =====================================================
// Target reps/secondi per esercizi in protocolli (AMRAP, EMOM, …)
// Stesso UX del toggle Reps | Sec nelle schede (SetsTable).
// =====================================================

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  getProtocolTargetMode,
  switchProtocolTargetMode,
  type ProtocolExerciseTarget,
} from '@/lib/protocols/exerciseTarget';
import type { SetTargetMode } from '@/types/database';
import { TouchIntegerInput } from '@/components/pt/TouchIntegerInput';

interface ProtocolTargetFieldProps {
  value: Pick<ProtocolExerciseTarget, 'mode' | 'reps' | 'duration_seconds'>;
  onChange: (next: Required<ProtocolExerciseTarget>) => void;
  className?: string;
  /** Label sopra il campo; se null/undefined mostra "Target". */
  label?: string | null;
  inputClassName?: string;
  showLabel?: boolean;
  id?: string;
}

export function ProtocolTargetField({
  value,
  onChange,
  className,
  label = 'Target',
  inputClassName,
  showLabel = true,
  id,
}: ProtocolTargetFieldProps) {
  const mode = getProtocolTargetMode(value);

  const setMode = (next: SetTargetMode) => {
    onChange(switchProtocolTargetMode(value, next));
  };

  const commitNumber = (n: number) => {
    if (mode === 'seconds') {
      onChange({ mode: 'seconds', duration_seconds: n, reps: null });
    } else {
      onChange({ mode: 'reps', reps: n, duration_seconds: null });
    }
  };

  return (
    <div className={cn('space-y-0.5', className)}>
      {showLabel && label != null && (
        <Label className="text-[10px] text-muted-foreground">{label}</Label>
      )}
      <div className="flex flex-col gap-1">
        <div className="flex rounded border border-border overflow-hidden h-8 sm:h-6">
          <button
            type="button"
            className={cn(
              'flex-1 text-xs sm:text-[10px] font-medium transition-colors',
              mode === 'reps'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted',
            )}
            onClick={() => setMode('reps')}
          >
            Reps
          </button>
          <button
            type="button"
            className={cn(
              'flex-1 text-xs sm:text-[10px] font-medium transition-colors border-l border-border',
              mode === 'seconds'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted',
            )}
            onClick={() => setMode('seconds')}
          >
            Sec
          </button>
        </div>
        <TouchIntegerInput
          id={id}
          value={mode === 'seconds' ? value.duration_seconds : value.reps}
          onCommit={commitNumber}
          min={1}
          fallback={1}
          aria-label={mode === 'seconds' ? 'Secondi' : 'Reps'}
          inputClassName={inputClassName}
        />
      </div>
    </div>
  );
}
