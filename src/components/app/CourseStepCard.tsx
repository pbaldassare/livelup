import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Dumbbell, Lock, Loader2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CourseProgressBar } from '@/components/app/CourseProgressBar';
import { VideoEmbed } from '@/components/common/VideoEmbed';
import { cn } from '@/lib/utils';
import {
  resolveStepVideoUrls,
  type PtCourseStep,
  type PtCourseStepExercise,
  type PtCourseStepProgress,
} from '@/lib/api/courses';

interface CourseStepCardProps {
  step: PtCourseStep;
  stepNumber: number;
  progress?: PtCourseStepProgress | null;
  onComplete?: () => void;
  isCompleting?: boolean;
  onStartWorkout?: () => void;
  isStartingWorkout?: boolean;
}

export function CourseStepCard({
  step,
  stepNumber,
  progress,
  onComplete,
  isCompleting,
  onStartWorkout,
  isStartingWorkout,
}: CourseStepCardProps) {
  const [open, setOpen] = useState(false);
  const [videoIndex, setVideoIndex] = useState(0);
  const status = progress?.status ?? 'locked';
  const isLocked = status === 'locked';
  const isCompleted = status === 'completed';
  const progressPct = progress?.progress_pct ?? 0;
  const isVideoStep = (step.step_type || 'exercises') === 'video';
  const videoUrls = useMemo(() => resolveStepVideoUrls(step), [step]);
  const hasVideos = videoUrls.length > 0;
  const safeVideoIndex = Math.min(videoIndex, Math.max(0, videoUrls.length - 1));
  const currentVideoUrl = hasVideos ? videoUrls[safeVideoIndex] : null;
  const exercises = [...(step.pt_course_step_exercises || [])].sort(
    (a, b) => a.order_index - b.order_index,
  );

  return (
    <Collapsible open={open && !isLocked} onOpenChange={(v) => !isLocked && setOpen(v)}>
      <div
        className={cn(
          'rounded-xl border border-app-border bg-app-card overflow-hidden',
          isLocked && 'opacity-70',
        )}
      >
        <CollapsibleTrigger asChild disabled={isLocked}>
          <button
            type="button"
            className={cn(
              'w-full flex items-start gap-3 p-4 text-left',
              !isLocked && 'hover:bg-app-muted/30 transition-colors',
            )}
          >
            <div
              className={cn(
                'h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold',
                isCompleted && 'bg-app-accent text-app-accent-foreground',
                isLocked && 'bg-app-muted text-app-muted-foreground',
                !isCompleted && !isLocked && 'bg-app-accent/20 text-app-accent',
              )}
            >
              {isLocked ? (
                <Lock className="h-4 w-4" />
              ) : isCompleted ? (
                <Check className="h-5 w-5" />
              ) : isVideoStep ? (
                <Video className="h-4 w-4" />
              ) : (
                stepNumber
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-app-muted-foreground">
                    Step {stepNumber}
                    {isVideoStep
                      ? videoUrls.length > 1
                        ? ` · ${videoUrls.length} video`
                        : ' · Video'
                      : null}
                  </p>
                  <h3 className="font-semibold text-app-foreground truncate">{step.title}</h3>
                  {step.description ? (
                    <p className="text-sm text-app-muted-foreground line-clamp-2 mt-0.5">
                      {step.description}
                    </p>
                  ) : null}
                  {isVideoStep && step.video_duration_minutes ? (
                    <p className="text-xs text-app-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      ~{step.video_duration_minutes} min
                    </p>
                  ) : null}
                </div>
                {!isLocked && (
                  <div className="flex items-center gap-2 shrink-0">
                    <CourseProgressBar value={progressPct} size={44} strokeWidth={4} />
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-app-muted-foreground transition-transform',
                        open && 'rotate-180',
                      )}
                    />
                  </div>
                )}
              </div>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3 border-t border-app-border pt-3">
            {isVideoStep ? (
              <>
                {currentVideoUrl ? (
                  <div className="space-y-2">
                    {videoUrls.length > 1 ? (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-app-muted-foreground">
                          Video {safeVideoIndex + 1} di {videoUrls.length}
                        </p>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 border-app-border"
                            disabled={safeVideoIndex === 0}
                            onClick={() => setVideoIndex((i) => Math.max(0, i - 1))}
                            aria-label="Video precedente"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 border-app-border"
                            disabled={safeVideoIndex >= videoUrls.length - 1}
                            onClick={() =>
                              setVideoIndex((i) => Math.min(videoUrls.length - 1, i + 1))
                            }
                            aria-label="Video successivo"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    <VideoEmbed
                      url={currentVideoUrl}
                      title={`${step.title} — video ${safeVideoIndex + 1}`}
                      className="rounded-xl"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-app-muted-foreground">
                    Video non ancora disponibile per questo step.
                  </p>
                )}

                {!isCompleted && (
                  <Button
                    type="button"
                    className="w-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
                    disabled={isLocked || isCompleting || !onComplete || !hasVideos}
                    onClick={() => onComplete?.()}
                  >
                    {isCompleting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    {videoUrls.length > 1 ? 'Ho visto i video' : 'Ho visto il video'}
                  </Button>
                )}
              </>
            ) : (
              <>
                {exercises.length === 0 ? (
                  <p className="text-sm text-app-muted-foreground">Nessun esercizio in questo step.</p>
                ) : (
                  <ul className="space-y-2">
                    {exercises.map((ex) => (
                      <ExerciseRow key={ex.id} exercise={ex} />
                    ))}
                  </ul>
                )}

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-app-border text-app-foreground"
                    disabled={
                      isLocked ||
                      isStartingWorkout ||
                      exercises.length === 0 ||
                      !onStartWorkout
                    }
                    onClick={() => onStartWorkout?.()}
                  >
                    {isStartingWorkout ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Dumbbell className="h-4 w-4 mr-2" />
                    )}
                    Avvia corso
                  </Button>
                  {!isCompleted && (
                    <Button
                      type="button"
                      className="flex-1 bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
                      disabled={isLocked || isCompleting || !onComplete}
                      onClick={() => onComplete?.()}
                    >
                      {isCompleting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Segna come completato
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function ExerciseRow({ exercise }: { exercise: PtCourseStepExercise }) {
  const name = exercise.exercises?.name || 'Esercizio';
  const meta = [
    exercise.sets != null ? `${exercise.sets} serie` : null,
    exercise.reps ? `${exercise.reps} rip` : null,
    exercise.rest_seconds != null ? `${exercise.rest_seconds}s riposo` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className="flex items-center gap-3 rounded-lg bg-app-muted/40 px-3 py-2">
      <div className="h-9 w-9 rounded-md bg-app-muted flex items-center justify-center shrink-0 overflow-hidden">
        {exercise.exercises?.image_url ? (
          <img
            src={exercise.exercises.image_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <Dumbbell className="h-4 w-4 text-app-muted-foreground" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-app-foreground truncate">{name}</p>
        {meta ? <p className="text-xs text-app-muted-foreground">{meta}</p> : null}
        {exercise.notes ? (
          <p className="text-xs text-app-muted-foreground line-clamp-1">{exercise.notes}</p>
        ) : null}
      </div>
    </li>
  );
}

export default CourseStepCard;
