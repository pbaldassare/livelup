import { useState, type HTMLAttributes } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { GripVertical, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  addExerciseToStep,
  courseQueryKeys,
  deleteStep,
  removeExerciseFromStep,
  updateStep,
  updateStepExercise,
  type PtCourseStep,
  type PtCourseStepExercise,
} from '@/lib/api/courses';
import { StepExercisePicker } from './StepExercisePicker';
import { cn } from '@/lib/utils';

interface CourseStepEditorProps {
  courseId: string;
  step: PtCourseStep;
  dragHandleProps?: HTMLAttributes<HTMLElement> | null;
  className?: string;
}

export function CourseStepEditor({
  courseId,
  step,
  dragHandleProps,
  className,
}: CourseStepEditorProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(step.title);
  const [description, setDescription] = useState(step.description || '');
  const [threshold, setThreshold] = useState(step.completion_threshold ?? 100);
  const [pickerOpen, setPickerOpen] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: courseQueryKeys.detail(courseId) });
  };

  const saveStepMutation = useMutation({
    mutationFn: () =>
      updateStep(step.id, {
        title,
        description,
        completion_threshold: threshold,
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

  const exercises = step.pt_course_step_exercises || [];

  return (
    <div className={cn('rounded-lg border border-border bg-card p-4 space-y-4', className)}>
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-1 p-1 rounded text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          aria-label="Trascina per riordinare"
          {...dragHandleProps}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 space-y-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor={`step-title-${step.id}`}>Titolo step</Label>
              <Input
                id={`step-title-${step.id}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => {
                  if (title.trim() && title !== step.title) saveStepMutation.mutate();
                }}
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
            <Label htmlFor={`step-desc-${step.id}`}>Descrizione</Label>
            <Textarea
              id={`step-desc-${step.id}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => {
                if ((description || '') !== (step.description || '')) saveStepMutation.mutate();
              }}
              rows={2}
              placeholder="Obiettivo e indicazioni dello step"
            />
          </div>

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
        </div>
      </div>

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
          <p className="text-xs text-muted-foreground py-2">
            Nessun esercizio in questo step
          </p>
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
