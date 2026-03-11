import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// SET TRACKER - Track reps, weight, RPE for each set
// =====================================================

interface SetData {
  setNumber: number;
  prescribedReps: string;
  prescribedWeight?: number;
  completedReps?: number;
  completedWeight?: number;
  completedRpe?: number;
  isCompleted: boolean;
}

interface SetTrackerProps {
  sets: SetData[];
  currentSet: number;
  onSetComplete: (setNumber: number, reps: number, weight?: number, rpe?: number) => void;
  onSetChange: (setNumber: number) => void;
  restSeconds?: number;
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
}: SetTrackerProps) {
  const [reps, setReps] = useState<number>(0);
  const [weight, setWeight] = useState<number>(0);
  const [rpe, setRpe] = useState<number>(7);
  const [showDetails, setShowDetails] = useState(false);

  const current = sets.find(s => s.setNumber === currentSet);

  // Pre-populate from previous set data
  const handleComplete = () => {
    onSetComplete(currentSet, reps, weight || undefined, rpe);
    // Pre-fill next set with same weight
    setReps(0);
  };

  const incrementReps = () => setReps(prev => prev + 1);
  const decrementReps = () => setReps(prev => Math.max(0, prev - 1));
  const incrementWeight = () => setWeight(prev => prev + 2.5);
  const decrementWeight = () => setWeight(prev => Math.max(0, prev - 2.5));

  return (
    <div className="bg-app-card rounded-t-3xl p-4 space-y-4">
      {/* Drag handle */}
      <div className="flex justify-center">
        <div className="w-12 h-1.5 bg-app-border rounded-full" />
      </div>

      {/* Exercise header */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div>
          <h3 className="font-bold text-app-foreground text-lg">
            {current?.prescribedReps || '—'} reps
          </h3>
          {current?.prescribedWeight && (
            <p className="text-sm text-app-muted-foreground">
              {current.prescribedWeight} kg suggested
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-app-accent font-semibold">
            {currentSet} of {sets.length}
          </span>
          {showDetails ? (
            <ChevronUp className="h-5 w-5 text-app-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-app-muted-foreground" />
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-app-muted rounded-full h-1.5">
        <div 
          className="bg-app-accent h-1.5 rounded-full transition-all"
          style={{ width: `${(currentSet / sets.length) * 100}%` }}
        />
      </div>

      {/* Detailed input (collapsible) */}
      {showDetails && (
        <div className="space-y-4 pt-2">
          {/* Reps input */}
          <div className="flex items-center justify-between">
            <span className="text-app-foreground font-medium">Reps completate</span>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={decrementReps}
                className="h-10 w-10 rounded-full border-app-border"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                value={reps}
                onChange={(e) => setReps(parseInt(e.target.value) || 0)}
                className="w-16 text-center bg-app-muted border-app-border text-app-foreground text-lg font-bold"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={incrementReps}
                className="h-10 w-10 rounded-full border-app-border"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Weight input */}
          <div className="flex items-center justify-between">
            <span className="text-app-foreground font-medium">Peso (kg)</span>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={decrementWeight}
                className="h-10 w-10 rounded-full border-app-border"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                className="w-16 text-center bg-app-muted border-app-border text-app-foreground text-lg font-bold"
                step={0.5}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={incrementWeight}
                className="h-10 w-10 rounded-full border-app-border"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* RPE input */}
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
                      : 'bg-app-muted text-app-muted-foreground hover:bg-app-muted/80'
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

      {/* Set completion buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={handleComplete}
          className="flex-1 bg-app-accent text-app-accent-foreground hover:bg-app-accent/90 rounded-full h-12"
        >
          <Check className="h-5 w-5 mr-2" />
          Completa Set
        </Button>
      </div>

      {/* Set indicators */}
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
                : 'bg-app-muted text-app-muted-foreground'
            )}
          >
            {set.isCompleted ? <Check className="h-4 w-4" /> : set.setNumber}
          </button>
        ))}
      </div>
    </div>
  );
}

export default SetTracker;
