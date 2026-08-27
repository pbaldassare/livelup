import { useState } from 'react';
import { Dumbbell, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExerciseDetailDialog } from '@/components/exercises/ExerciseDetailDialog';
import {
  isExerciseShareAttachment,
  parseExerciseSharePayload,
  type SharedExerciseSnapshot,
} from '@/lib/exerciseShare';
import { cn } from '@/lib/utils';

interface SharedExerciseChatCardProps {
  attachmentType?: string | null;
  attachmentUrl?: string | null;
  className?: string;
}

export function SharedExerciseChatCard({
  attachmentType,
  attachmentUrl,
  className,
}: SharedExerciseChatCardProps) {
  const [open, setOpen] = useState(false);
  const [preferVideo, setPreferVideo] = useState(false);
  const exercise = parseExerciseSharePayload(attachmentUrl);

  if (!isExerciseShareAttachment(attachmentType) || !exercise) return null;

  const openViewer = (videoFirst: boolean) => {
    setPreferVideo(videoFirst && !!exercise.video_url);
    setOpen(true);
  };

  return (
    <>
      <div
        className={cn(
          'overflow-hidden rounded-xl border bg-background text-foreground shadow-sm',
          className,
        )}
      >
        <button
          type="button"
          onClick={() => openViewer(!!exercise.video_url)}
          className="flex w-full items-stretch gap-3 p-2 text-left"
        >
          <ExerciseThumb exercise={exercise} />
          <div className="min-w-0 flex-1 py-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Esercizio consigliato
            </p>
            <p className="truncate text-sm font-semibold">{exercise.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[exercise.category, exercise.difficulty_level].filter(Boolean).join(' · ') || 'Prova libera'}
            </p>
          </div>
        </button>
        <div className="grid grid-cols-2 gap-1.5 border-t p-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-full text-xs"
            onClick={() => openViewer(true)}
            disabled={!exercise.video_url}
          >
            <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
            Guarda
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-full text-xs"
            onClick={() => openViewer(false)}
          >
            <Dumbbell className="mr-1.5 h-3.5 w-3.5" />
            Prova
          </Button>
        </div>
      </div>
      <ExerciseDetailDialog
        exercise={exercise}
        open={open}
        onOpenChange={setOpen}
        sharedPractice
        preferVideo={preferVideo}
      />
    </>
  );
}

function ExerciseThumb({ exercise }: { exercise: SharedExerciseSnapshot }) {
  if (exercise.image_url) {
    return (
      <img
        src={exercise.image_url}
        alt=""
        className="h-16 w-16 shrink-0 rounded-lg object-cover"
      />
    );
  }
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      {exercise.video_url ? <PlayCircle className="h-6 w-6" /> : <Dumbbell className="h-6 w-6" />}
    </div>
  );
}
