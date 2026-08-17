import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GraduationCap, Info, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CourseProgressBar } from '@/components/app/CourseProgressBar';
import { CourseStepCard } from '@/components/app/CourseStepCard';
import { CourseStepPreviewPlayer } from './CourseStepPreviewPlayer';
import { getCourseWithSteps, type PtCourseStep, type StepProgressStatus } from '@/lib/api/courses';

interface CoursePreviewDialogProps {
  courseId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LocalStepState {
  status: StepProgressStatus;
  progress_pct: number;
}

/**
 * Anteprima locale di un corso per il PT proprietario, prima della pubblicazione.
 * Nessuna scrittura su pt_course_enrollments / pt_course_step_progress / workouts:
 * tutto lo stato di avanzamento vive solo in questo componente.
 */
export function CoursePreviewDialog({ courseId, open, onOpenChange }: CoursePreviewDialogProps) {
  const [stepState, setStepState] = useState<Record<string, LocalStepState>>({});
  const [playingStepId, setPlayingStepId] = useState<string | null>(null);

  const {
    data: course,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['pt-course-preview', courseId],
    queryFn: () => getCourseWithSteps(courseId!),
    enabled: open && !!courseId,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!open) {
      setStepState({});
      setPlayingStepId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !course) return;

    const steps = [...(course.pt_course_steps || [])].sort(
      (a, b) => a.order_index - b.order_index,
    );
    const sequential = !!course.requires_sequential_steps;
    const initial: Record<string, LocalStepState> = {};
    steps.forEach((step, index) => {
      const unlocked = !sequential || index === 0;
      initial[step.id] = { status: unlocked ? 'in_progress' : 'locked', progress_pct: 0 };
    });
    setStepState(initial);
    setPlayingStepId(null);
    // Reinizializza solo all'apertura o al cambio corso, non a ogni refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, course?.id]);

  const orderedSteps = useMemo(
    () => [...(course?.pt_course_steps || [])].sort((a, b) => a.order_index - b.order_index),
    [course?.pt_course_steps],
  );

  const overallPct = useMemo(() => {
    const values = Object.values(stepState);
    if (values.length === 0) return 0;
    return Math.round(values.reduce((acc, v) => acc + v.progress_pct, 0) / values.length);
  }, [stepState]);

  const markStepCompleted = (stepId: string) => {
    setStepState((prev) => {
      const current = prev[stepId];
      if (!current || current.status === 'locked' || current.status === 'completed') return prev;

      const next: Record<string, LocalStepState> = {
        ...prev,
        [stepId]: { status: 'completed', progress_pct: 100 },
      };

      if (course?.requires_sequential_steps) {
        const idx = orderedSteps.findIndex((s) => s.id === stepId);
        const nextStep = idx >= 0 ? orderedSteps[idx + 1] : undefined;
        if (nextStep && next[nextStep.id]?.status === 'locked') {
          next[nextStep.id] = { status: 'in_progress', progress_pct: 0 };
        }
      }

      return next;
    });
  };

  const playingStep: PtCourseStep | undefined = playingStepId
    ? orderedSteps.find((s) => s.id === playingStepId)
    : undefined;

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg w-[calc(100%-1.5rem)] sm:w-full max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 p-0 overflow-hidden flex flex-col">
        {playingStep ? (
          <>
            <DialogHeader className="px-4 sm:px-6 pt-6 pb-3 border-b">
              <DialogTitle className="text-base">{playingStep.title}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4">
              <CourseStepPreviewPlayer
                step={playingStep}
                onExit={() => setPlayingStepId(null)}
                onFinish={() => {
                  markStepCompleted(playingStep.id);
                  setPlayingStepId(null);
                }}
              />
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="px-4 sm:px-6 pt-6 pb-3 border-b">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <GraduationCap className="h-5 w-5 text-primary" />
                {course ? course.title : 'Anteprima corso'}
              </DialogTitle>
              <div className="flex items-start gap-2 rounded-lg bg-muted/60 border border-border px-3 py-2 mt-2">
                <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Modalità anteprima — Stai collaudando il corso prima di pubblicarlo. Nessun dato
                  viene salvato.
                </p>
              </div>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : isError || !course ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  Corso non trovato
                </p>
              ) : (
                <>
                  {course.cover_image_url ? (
                    <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
                      <img
                        src={course.cover_image_url}
                        alt={course.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}

                  <div className="flex justify-center">
                    <CourseProgressBar
                      value={overallPct}
                      size={80}
                      strokeWidth={6}
                      label="Completamento anteprima"
                    />
                  </div>

                  <div className="space-y-3">
                    {orderedSteps.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Nessuno step in questo corso.
                      </p>
                    ) : (
                      orderedSteps.map((step, index) => {
                        const local = stepState[step.id];
                        const isExerciseStep = (step.step_type || 'exercises') === 'exercises';
                        const stepExercises = step.pt_course_step_exercises || [];
                        const status = local?.status ?? 'locked';

                        return (
                          <CourseStepCard
                            key={step.id}
                            step={step}
                            stepNumber={index + 1}
                            progress={{
                              id: '',
                              enrollment_id: '',
                              step_id: step.id,
                              atleta_user_id: '',
                              status,
                              progress_pct: local?.progress_pct ?? 0,
                              completed_at: null,
                            }}
                            isCompleting={false}
                            isStartingWorkout={false}
                            onComplete={
                              status !== 'locked' && status !== 'completed'
                                ? () => markStepCompleted(step.id)
                                : undefined
                            }
                            onStartWorkout={
                              isExerciseStep && stepExercises.length > 0 && status !== 'locked'
                                ? () => setPlayingStepId(step.id)
                                : undefined
                            }
                          />
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="px-4 sm:px-6 py-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Chiudi anteprima
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default CoursePreviewDialog;
