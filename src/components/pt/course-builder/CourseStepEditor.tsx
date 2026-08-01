import { useEffect, useState, type HTMLAttributes } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GripVertical, Loader2, Plus, Trash2, Upload, Video, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  addExerciseToStep,
  courseQueryKeys,
  deleteStep,
  removeExerciseFromStep,
  updateStep,
  updateStepExercise,
  type CourseStepType,
  type PtCourseStep,
  type PtCourseStepExercise,
} from '@/lib/api/courses';
import { StepExercisePicker } from './StepExercisePicker';
import { VideoEmbed } from '@/components/common/VideoEmbed';
import { dndDragHandleClassName } from '@/lib/dnd/helloPangea';
import { cn } from '@/lib/utils';

const STEP_TYPE_OPTIONS: { value: CourseStepType; label: string }[] = [
  { value: 'exercises', label: 'Esercizi' },
  { value: 'video', label: 'Video' },
];

interface CourseStepEditorProps {
  courseId: string;
  step: PtCourseStep;
  dragHandleProps?: HTMLAttributes<HTMLElement> | null;
  isDragging?: boolean;
  className?: string;
}

export function CourseStepEditor({
  courseId,
  step,
  dragHandleProps,
  isDragging = false,
  className,
}: CourseStepEditorProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(step.title);
  const [description, setDescription] = useState(step.description || '');
  const [stepType, setStepType] = useState<CourseStepType>(step.step_type || 'exercises');
  const [videoUrl, setVideoUrl] = useState(step.video_url || '');
  const [videoDuration, setVideoDuration] = useState(
    step.video_duration_minutes != null ? String(step.video_duration_minutes) : '',
  );
  const [threshold, setThreshold] = useState(step.completion_threshold ?? 100);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  useEffect(() => {
    setTitle(step.title);
    setDescription(step.description || '');
    setStepType(step.step_type || 'exercises');
    setVideoUrl(step.video_url || '');
    setVideoDuration(step.video_duration_minutes != null ? String(step.video_duration_minutes) : '');
    setThreshold(step.completion_threshold ?? 100);
  }, [step]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: courseQueryKeys.detail(courseId) });
  };

  const saveStepMutation = useMutation({
    mutationFn: (patch?: {
      title?: string;
      description?: string;
      step_type?: CourseStepType;
      video_url?: string | null;
      video_duration_minutes?: number | null;
      completion_threshold?: number;
    }) =>
      updateStep(step.id, {
        title: patch?.title ?? title,
        description: patch?.description ?? description,
        step_type: patch?.step_type ?? stepType,
        video_url:
          (patch?.step_type ?? stepType) === 'video'
            ? (patch?.video_url ?? videoUrl).trim() || null
            : null,
        video_duration_minutes:
          (patch?.step_type ?? stepType) === 'video'
            ? patch?.video_duration_minutes ??
              (videoDuration.trim() === '' ? null : Number(videoDuration))
            : null,
        completion_threshold: patch?.completion_threshold ?? threshold,
      }),
    onSuccess: () => {
      invalidate();
      toast.success('Step aggiornato');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteStepMutation = useMutation({
    mutationFn: () => deleteStep(step.id),
    onSuccess: () => {
      invalidate();
      toast.success('Step eliminato');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addExerciseMutation = useMutation({
    mutationFn: (exerciseId: string) =>
      addExerciseToStep({ stepId: step.id, exerciseId }),
    onSuccess: () => {
      invalidate();
      toast.success('Esercizio aggiunto');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateExerciseMutation = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: { sets?: number | null; reps?: string | null; rest_seconds?: number | null; notes?: string | null };
    }) => updateStepExercise(id, patch),
    onSuccess: () => invalidate(),
    onError: (err: Error) => toast.error(err.message),
  });

  const removeExerciseMutation = useMutation({
    mutationFn: (id: string) => removeExerciseFromStep(id),
    onSuccess: () => {
      invalidate();
      toast.success('Esercizio rimosso');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleVideoUpload = async (file: File) => {
    if (!user?.id) return;
    if (!file.type.startsWith('video/')) {
      toast.error('Seleziona un file video (MP4, WebM, MOV)');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error('Il video deve essere inferiore a 100MB');
      return;
    }

    setIsUploadingVideo(true);
    try {
      const ext = file.name.split('.').pop() || 'mp4';
      const path = `${user.id}/course-steps/${step.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('exercise-videos').upload(path, file);
      if (error) throw error;

      const { data: urlData } = supabase.storage.from('exercise-videos').getPublicUrl(path);
      const url = urlData.publicUrl;
      setVideoUrl(url);
      saveStepMutation.mutate({ video_url: url });
    } catch {
      toast.error('Errore upload video');
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleStepTypeChange = (next: CourseStepType) => {
    setStepType(next);
    saveStepMutation.mutate({
      step_type: next,
      video_url: next === 'video' ? videoUrl.trim() || null : null,
      video_duration_minutes:
        next === 'video' && videoDuration.trim() !== '' ? Number(videoDuration) : null,
    });
  };

  const commitMeta = () => {
    const nextDuration = videoDuration.trim() === '' ? null : Number(videoDuration);
    const changed =
      title.trim() !== step.title ||
      (description || '') !== (step.description || '') ||
      stepType !== (step.step_type || 'exercises') ||
      (stepType === 'video' && (videoUrl || '') !== (step.video_url || '')) ||
      (stepType === 'video' &&
        (nextDuration ?? null) !== (step.video_duration_minutes ?? null)) ||
      threshold !== (step.completion_threshold ?? 100);

    if (changed && title.trim()) {
      saveStepMutation.mutate({
        title,
        description,
        video_url: stepType === 'video' ? videoUrl.trim() || null : null,
        video_duration_minutes: stepType === 'video' ? nextDuration : null,
        completion_threshold: threshold,
      });
    }
  };

  const exercises = step.pt_course_step_exercises || [];
  const isVideoStep = stepType === 'video';

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-4 space-y-4',
        isDragging && '!transition-none shadow-none',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className={cn(dndDragHandleClassName, 'mt-0.5')}
          aria-label="Trascina per riordinare"
          title="Trascina per riordinare"
          {...dragHandleProps}
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <div className="flex-1 space-y-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor={`step-title-${step.id}`}>Titolo step</Label>
              <Input
                id={`step-title-${step.id}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={commitMeta}
                placeholder="Es. Fondamentali scapole"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive shrink-0"
              disabled={deleteStepMutation.isPending}
              onClick={() => {
                if (window.confirm('Eliminare questo step?')) deleteStepMutation.mutate();
              }}
            >
              {deleteStepMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Tipo step</Label>
            <Select value={stepType} onValueChange={(v) => handleStepTypeChange(v as CourseStepType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STEP_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`step-desc-${step.id}`}>Descrizione</Label>
            <Textarea
              id={`step-desc-${step.id}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={commitMeta}
              rows={2}
              placeholder={
                isVideoStep
                  ? 'Breve introduzione al video per l\'atleta'
                  : 'Obiettivo e indicazioni dello step'
              }
            />
          </div>

          {isVideoStep ? (
            <div className="space-y-3 rounded-lg border border-border bg-background/50 p-3">
              <div className="space-y-2">
                <Label htmlFor={`step-video-url-${step.id}`}>Video</Label>
                <p className="text-xs text-muted-foreground">
                  Carica un file o incolla un link (YouTube, Vimeo, URL diretto)
                </p>
                {videoUrl ? (
                  <div className="space-y-2">
                    <VideoEmbed url={videoUrl} title={title || 'Anteprima video'} />
                    <div className="flex gap-2">
                      <Input
                        id={`step-video-url-${step.id}`}
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        onBlur={commitMeta}
                        placeholder="https://..."
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setVideoUrl('');
                          saveStepMutation.mutate({ video_url: null });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      id={`step-video-url-${step.id}`}
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      onBlur={commitMeta}
                      placeholder="https://youtube.com/... o URL video"
                    />
                    <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-6 cursor-pointer hover:bg-muted/40 transition-colors">
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        className="hidden"
                        disabled={isUploadingVideo}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleVideoUpload(file);
                          e.target.value = '';
                        }}
                      />
                      {isUploadingVideo ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : (
                        <Upload className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {isUploadingVideo ? 'Caricamento...' : 'Carica video (max 100MB)'}
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`step-video-duration-${step.id}`}>Durata indicativa (min)</Label>
                <Input
                  id={`step-video-duration-${step.id}`}
                  type="number"
                  min="1"
                  value={videoDuration}
                  onChange={(e) => setVideoDuration(e.target.value)}
                  onBlur={commitMeta}
                  placeholder="Es. 5"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Soglia completamento</Label>
                <span className="text-sm font-medium text-primary">{threshold}%</span>
              </div>
              <Slider
                value={[threshold]}
                min={0}
                max={100}
                step={5}
                onValueChange={(v) => setThreshold(v[0] ?? 100)}
                onValueCommit={(v) => {
                  const next = v[0] ?? 100;
                  setThreshold(next);
                  if (next !== step.completion_threshold) {
                    updateStep(step.id, { completion_threshold: next })
                      .then(() => {
                        invalidate();
                        toast.success('Soglia aggiornata');
                      })
                      .catch((err: Error) => toast.error(err.message));
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>

      {!isVideoStep ? (
        <div className="space-y-2 pl-7">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Esercizi</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPickerOpen(true)}
              disabled={addExerciseMutation.isPending}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Aggiungi esercizio
            </Button>
          </div>

          {exercises.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Nessun esercizio in questo step</p>
          ) : (
            <ul className="space-y-2">
              {exercises.map((ex) => (
                <StepExerciseRow
                  key={ex.id}
                  exercise={ex}
                  busy={updateExerciseMutation.isPending || removeExerciseMutation.isPending}
                  onSave={(patch) => updateExerciseMutation.mutate({ id: ex.id, patch })}
                  onRemove={() => removeExerciseMutation.mutate(ex.id)}
                />
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="pl-7 flex items-center gap-2 text-xs text-muted-foreground">
          <Video className="h-3.5 w-3.5" />
          Step video — l&apos;atleta visualizza il contenuto e lo segna come completato
        </div>
      )}

      <StepExercisePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        excludeIds={exercises.map((e) => e.exercise_id)}
        onSelect={(picked) => addExerciseMutation.mutate(picked.id)}
      />
    </div>
  );
}

function StepExerciseRow({
  exercise,
  busy,
  onSave,
  onRemove,
}: {
  exercise: PtCourseStepExercise;
  busy: boolean;
  onSave: (patch: {
    sets?: number | null;
    reps?: string | null;
    rest_seconds?: number | null;
    notes?: string | null;
  }) => void;
  onRemove: () => void;
}) {
  const [sets, setSets] = useState(String(exercise.sets ?? ''));
  const [reps, setReps] = useState(exercise.reps ?? '');
  const [rest, setRest] = useState(String(exercise.rest_seconds ?? ''));
  const [notes, setNotes] = useState(exercise.notes ?? '');

  const commit = () => {
    const next = {
      sets: sets === '' ? null : Number(sets),
      reps: reps.trim() || null,
      rest_seconds: rest === '' ? null : Number(rest),
      notes: notes.trim() || null,
    };
    const changed =
      next.sets !== (exercise.sets ?? null) ||
      next.reps !== (exercise.reps ?? null) ||
      next.rest_seconds !== (exercise.rest_seconds ?? null) ||
      next.notes !== (exercise.notes ?? null);
    if (changed) onSave(next);
  };

  return (
    <li className="rounded-md border border-border bg-background p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium truncate">
          {exercise.exercises?.name || 'Esercizio'}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          disabled={busy}
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Serie</Label>
          <Input
            value={sets}
            onChange={(e) => setSets(e.target.value)}
            onBlur={commit}
            inputMode="numeric"
            placeholder="3"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ripetizioni</Label>
          <Input
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            onBlur={commit}
            placeholder="8-12"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Recupero (s)</Label>
          <Input
            value={rest}
            onChange={(e) => setRest(e.target.value)}
            onBlur={commit}
            inputMode="numeric"
            placeholder="60"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Note</Label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={commit}
          placeholder="Note per l'atleta"
        />
      </div>
    </li>
  );
}
