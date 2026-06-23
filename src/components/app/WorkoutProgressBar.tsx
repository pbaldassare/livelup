import { cn } from '@/lib/utils';

interface WorkoutProgressBarProps {
  exercises: Array<{ id: string }>;
  exerciseIndex: number;
  skipped?: Record<string, boolean>;
  current: number;
  total: number;
  label?: string;
}

export function WorkoutProgressBar({
  exercises,
  exerciseIndex,
  skipped = {},
  current,
  total,
  label,
}: WorkoutProgressBarProps) {
  return (
    <div className="px-4 pt-4 pb-2">
      <div className="flex gap-1">
        {exercises.map((ex, idx) => {
          const isCurrent = idx === exerciseIndex;
          const isDone = idx < exerciseIndex || !!skipped[ex.id];
          return (
            <div
              key={ex.id}
              className={cn(
                'flex-1 h-1 rounded-full',
                isDone ? 'bg-app-accent' : isCurrent ? 'bg-app-accent/50' : 'bg-app-muted',
              )}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-app-muted-foreground">
          Esercizio {current}/{total}
        </span>
        {label ? (
          <span className="text-xs text-app-muted-foreground">{label}</span>
        ) : null}
      </div>
    </div>
  );
}
