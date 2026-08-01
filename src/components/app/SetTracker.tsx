import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExerciseHeader } from '@/components/app/ExerciseHeader';

// =====================================================
// SET TRACKER - Track reps/duration, weight, RPE for each set
// =====================================================

interface SetData {
  setNumber: number;
  /** Display label e.g. "10" or "20s" */
  prescribedTarget: string;
  targetMode?: 'reps' | 'seconds';
  prescribedReps?: string;
  prescribedDuration?: number;
  prescribedWeight?: number;
  completedReps?: number;
  completedDuration?: number;
  completedWeight?: number;
  completedRpe?: number;
  isCompleted: boolean;
}

interface SetTrackerProps {
  sets: SetData[];
  currentSet: number;
  onSetComplete: (
    setNumber: number,
    reps: number,
    weight?: number,
    rpe?: number,
    durationSeconds?: number,
  ) => void;
  onSetChange: (setNumber: number) => void;
  restSeconds?: number;
  initialReps?: number;
  initialDuration?: number;
  initialWeight?: number;
  exerciseName?: string;
  protocolType?: string | null;
  notes?: string | null;
  onShowDetails?: () => void;
}

const RPE_LABELS: Record<number, string> = {
  6: 'Facile',
  7: 'Moderato',
  8: 'Impegnativo',
  9: 'Molto duro',
  10: 'Massimale',
};

export function SetTracker({
  sets,
  currentSet,
  onSetComplete,
  onSetChange,
  restSeconds = 60,
  initialReps,
  initialDuration,
  initialWeight,
  exerciseName,
  protocolType,
  notes,
  onShowDetails,
}: SetTrackerProps) {
  const current = sets.find((s) => s.setNumber === currentSet);
  const isSeconds = current?.targetMode === 'seconds';

  const getDefaultReps = () => {
    if (initialReps !== undefined && initialReps > 0) return initialReps;
    if (current?.prescribedReps) {
      const parsed = parseInt(current.prescribedReps, 10);
      if (!isNaN(parsed)) return parsed;
    }
    if (current?.prescribedTarget && current.targetMode !== 'seconds') {
      const parsed = parseInt(current.prescribedTarget, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return 0;
  };

  const getDefaultDuration = () => {
    if (initialDuration !== undefined && initialDuration > 0) return initialDuration;
    if (typeof current?.prescribedDuration === 'number' && current.prescribedDuration > 0) {
      return current.prescribedDuration;
    }
    if (current?.prescribedTarget?.endsWith('s')) {
      const parsed = parseInt(current.prescribedTarget, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return 0;
  };

  const getDefaultWeight = () => {
    if (initialWeight !== undefined && initialWeight > 0) return initialWeight;
    return current?.prescribedWeight || 0;
  };

  const [reps, setReps] = useState<number>(getDefaultReps());
  const [duration, setDuration] = useState<number>(getDefaultDuration());
  const [weight, setWeight] = useState<number>(getDefaultWeight());
  const [rpe, setRpe] = useState<number>(7);
  const [showDetails, setShowDetails] = useState(true);

  useEffect(() => {
    setReps(getDefaultReps());
    setDuration(getDefaultDuration());
    setWeight(getDefaultWeight());
  }, [currentSet, initialReps, initialDuration, initialWeight]);

  const handleComplete = () => {
    if (isSeconds) {
      onSetComplete(currentSet, 0, weight || undefined, rpe, duration);
    } else {
      onSetComplete(currentSet, reps, weight || undefined, rpe, undefined);
    }
    setReps(getDefaultReps());
    setDuration(getDefaultDuration());
  };

  const incrementReps = () => setReps((prev) => prev + 1);
  const decrementReps = () => setReps((prev) => Math.max(0, prev - 1));
  const incrementDuration = () => setDuration((prev) => prev + 5);
  const decrementDuration = () => setDuration((prev) => Math.max(0, prev - 5));
  const incrementWeight = () => setWeight((prev) => prev + 2.5);
  const decrementWeight = () => setWeight((prev) => Math.max(0, prev - 2.5));

  const targetLabel = current?.prescribedTarget || current?.prescribedReps || '—';

  return (
    <div className="bg-app-card rounded-t-3xl p-4 space-y-4">
      <div className="flex justify-center">
        <div className="w-12 h-1.5 bg-app-border rounded-full" />
      </div>

      {exerciseName && (
        <ExerciseHeader
          name={exerciseName}
          protocolType={protocolType ?? 'standard'}
          notes={notes ?? null}
          onShowDetails={onShowDetails}
          size="md"
          align="left"
        />
      )}

      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div>
          <h3 className="font-bold text-app-foreground text-lg">
            {isSeconds ? `Target ${targetLabel}` : `${targetLabel} reps`}
          </h3>
          {current?.prescribedWeight && (
            <p className="text-sm text-app-muted-foreground">
              {current.prescribedWeight} kg consigliati
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-app-accent font-semibold">
            {currentSet} di {sets.length}
          </span>
          {showDetails ? (
            <ChevronUp className="h-5 w-5 text-app-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-app-muted-foreground" />
          )}
        </div>
      </div>

      <div className="w-full bg-app-muted rounded-full h-1.5">
        <div
          className="bg-app-accent h-1.5 rounded-full transition-all"
          style={{ width: `${(currentSet / sets.length) * 100}%` }}
        />
      </div>

      {showDetails && (
        <div className="space-y-4 pt-2">
          {isSeconds ? (
            <SetInput
              label="Secondi completati"
              value={duration}
              onChange={setDuration}
              onIncrement={incrementDuration}
              onDecrement={decrementDuration}
              step={5}
            />
          ) : (
            <SetInput
              label="Reps completate"
              value={reps}
              onChange={setReps}
              onIncrement={incrementReps}
              onDecrement={decrementReps}
              step={1}
            />
          )}
          <SetInput
            label="Peso (kg)"
            value={weight}
            onChange={(v) => setWeight(v)}
            onIncrement={incrementWeight}
            onDecrement={decrementWeight}
            step={0.5}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-app-foreground font-medium">RPE (sforzo percepito)</span>
              <span className="text-sm text-app-accent font-semibold">{rpe}/10</span>
            </div>
            <div className="flex gap-1.5">
              {[6, 7, 8, 9, 10].map((val) => (
                <button
                  key={val}
                  onClick={() => setRpe(val)}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                    rpe === val
                      ? 'bg-app-accent text-app-accent-foreground'
                      : 'bg-app-muted text-app-muted-foreground hover:bg-app-muted/80',
                  )}
                >
                  {val}
                </button>
              ))}
            </div>
            <p className="text-xs text-app-muted-foreground text-center">
              {RPE_LABELS[rpe] || ''}
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button
          onClick={handleComplete}
          className="flex-1 bg-app-accent text-app-accent-foreground hover:bg-app-accent/90 rounded-full h-12"
        >
          <Check className="h-5 w-5 mr-2" />
          Completa Set
        </Button>
      </div>

      <div className="flex justify-center gap-2 pt-2">
        {sets.map((set) => (
          <button
            key={set.setNumber}
            onClick={() => onSetChange(set.setNumber)}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
              set.isCompleted
                ? 'bg-app-accent text-app-accent-foreground'
                : set.setNumber === currentSet
                  ? 'bg-app-muted text-app-foreground ring-2 ring-app-accent'
                  : 'bg-app-muted text-app-muted-foreground',
            )}
          >
            {set.isCompleted ? <Check className="h-4 w-4" /> : set.setNumber}
          </button>
        ))}
      </div>

      {(() => {
        const completedSets = sets.filter((s) => s.isCompleted).length;
        const totalSets = sets.length;
        const pct = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
        let statusLabel = '';
        let statusColor = '';
        if (pct === 100) {
          statusLabel = 'Completato';
          statusColor = 'text-app-accent';
        } else if (pct >= 50) {
          statusLabel = 'Quasi completato';
          statusColor = 'text-yellow-500';
        } else if (completedSets > 0) {
          statusLabel = 'In corso';
          statusColor = 'text-app-muted-foreground';
        }

        return statusLabel ? (
          <p className={cn('text-xs text-center font-medium', statusColor)}>
            {statusLabel} ({completedSets}/{totalSets} set)
          </p>
        ) : null;
      })()}
    </div>
  );
}

function SetInput({
  label,
  value,
  onChange,
  onIncrement,
  onDecrement,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  onIncrement: () => void;
  onDecrement: () => void;
  step: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-app-foreground font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={onDecrement}
          className="h-10 w-10 rounded-full border-app-border"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          value={value}
          onChange={(e) =>
            onChange(step === 1 ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0)
          }
          className="w-16 text-center bg-app-muted border-app-border text-app-foreground text-lg font-bold"
          step={step}
        />
        <Button
          variant="outline"
          size="icon"
          onClick={onIncrement}
          className="h-10 w-10 rounded-full border-app-border"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default SetTracker;
