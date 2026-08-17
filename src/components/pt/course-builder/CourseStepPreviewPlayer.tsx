import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Dumbbell, LogOut, TimerReset } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PtCourseStep, PtCourseStepExercise } from '@/lib/api/courses';

interface CourseStepPreviewPlayerProps {
  step: PtCourseStep;
  onExit: () => void;
  onFinish: () => void;
}

function formatRest(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Mini-player di anteprima per un singolo step "esercizi" del CoursePreviewDialog.
 * Stato interamente locale (serie fatte, esercizio corrente, timer riposo):
 * nessuna scrittura DB, viene scartato quando si esce dal player.
 */
export function CourseStepPreviewPlayer({ step, onExit, onFinish }: CourseStepPreviewPlayerProps) {
  const exercises = [...(step.pt_course_step_exercises || [])].sort(
    (a, b) => a.order_index - b.order_index,
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [doneSets, setDoneSets] = useState<Record<string, Set<number>>>({});
  const [restRemaining, setRestRemaining] = useState<number | null>(null);

  const total = exercises.length;
  const current: PtCourseStepExercise | undefined = exercises[currentIndex];
  const isLastExercise = currentIndex === total - 1;

  useEffect(() => {
    setRestRemaining(null);
  }, [currentIndex]);

  useEffect(() => {
    if (restRemaining === null) return;
    if (restRemaining <= 0) return;
    const timer = setInterval(() => {
      setRestRemaining((prev) => (prev === null ? null : Math.max(0, prev - 1)));
    }, 1000);
    return () => clearInterval(timer);
  }, [restRemaining]);

  if (!current) {
    return (
      <div className="space-y-4 text-center py-8">
        <p className="text-sm text-app-muted-foreground">Nessun esercizio in questo step.</p>
        <Button type="button" variant="outline" className="border-app-border text-app-foreground" onClick={onExit}>
          <LogOut className="h-4 w-4 mr-2" />
          Esci dall'anteprima
        </Button>
      </div>
    );
  }

  const currentDone = doneSets[current.id] ?? new Set<number>();
  const totalSets = current.sets ?? 0;
  const completedCount = currentDone.size;

  const toggleSet = (setNumber: number) => {
    setDoneSets((prev) => {
      const nextForExercise = new Set(prev[current.id] ?? []);
      const wasDone = nextForExercise.has(setNumber);
      if (wasDone) {
        nextForExercise.delete(setNumber);
      } else {
        nextForExercise.add(setNumber);
      }
      if (!wasDone && current.rest_seconds) {
        setRestRemaining(current.rest_seconds);
      }
      return { ...prev, [current.id]: nextForExercise };
    });
  };

  const skipRest = () => setRestRemaining(0);

  const goPrevious = () => setCurrentIndex((idx) => Math.max(0, idx - 1));

  const goNext = () => {
    if (isLastExercise) {
      onFinish();
    } else {
      setCurrentIndex((idx) => Math.min(total - 1, idx + 1));
    }
  };

  const meta = [
    totalSets ? `${totalSets} serie` : null,
    current.reps ? `${current.reps} rip` : null,
    current.rest_seconds != null ? `${current.rest_seconds}s riposo` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-app-muted-foreground uppercase tracking-wider">
          Esercizio {currentIndex + 1} di {total}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-app-muted-foreground hover:text-app-foreground"
          onClick={onExit}
        >
          <LogOut className="h-3.5 w-3.5 mr-1.5" />
          Esci dall'anteprima
        </Button>
      </div>

      <div className="rounded-xl border border-app-border bg-app-card overflow-hidden">
        {current.exercises?.image_url ? (
          <div className="aspect-video w-full bg-app-muted overflow-hidden">
            <img
              src={current.exercises.image_url}
              alt={current.exercises?.name || 'Esercizio'}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-video w-full bg-app-muted flex items-center justify-center">
            <Dumbbell className="h-10 w-10 text-app-muted-foreground" />
          </div>
        )}

        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-app-foreground">
              {current.exercises?.name || 'Esercizio'}
            </h3>
            {meta ? <p className="text-xs text-app-muted-foreground mt-0.5">{meta}</p> : null}
            {current.notes ? (
              <p className="text-xs text-app-muted-foreground mt-1 italic">{current.notes}</p>
            ) : null}
          </div>

          {totalSets > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-app-muted-foreground">
                Serie completate: {completedCount} / {totalSets}
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: totalSets }, (_, i) => i + 1).map((setNumber) => {
                  const isDone = currentDone.has(setNumber);
                  return (
                    <button
                      key={setNumber}
                      type="button"
                      onClick={() => toggleSet(setNumber)}
                      className={cn(
                        'h-9 min-w-9 px-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-1 transition-colors',
                        isDone
                          ? 'bg-app-accent text-app-accent-foreground border-app-accent'
                          : 'border-app-border text-app-foreground hover:bg-app-muted/40',
                      )}
                    >
                      {isDone ? <Check className="h-3.5 w-3.5" /> : null}
                      {setNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {restRemaining !== null && restRemaining > 0 ? (
            <div className="flex items-center justify-between rounded-lg bg-app-accent/15 border border-app-accent/30 px-3 py-2">
              <span className="text-sm font-medium text-app-accent flex items-center gap-1.5">
                <TimerReset className="h-4 w-4" />
                Riposo: {formatRest(restRemaining)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-app-muted-foreground hover:text-app-foreground"
                onClick={skipRest}
              >
                Salta riposo
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="border-app-border text-app-foreground"
          disabled={currentIndex === 0}
          onClick={goPrevious}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Indietro
        </Button>
        <Button
          type="button"
          className="flex-1 bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
          onClick={goNext}
        >
          {isLastExercise ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Completa step
            </>
          ) : (
            <>
              Esercizio successivo
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default CourseStepPreviewPlayer;
