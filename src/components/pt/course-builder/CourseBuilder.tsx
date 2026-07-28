import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { ImageUpload } from '@/components/common/ImageUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { ImagePlus, Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  addStep,
  courseQueryKeys,
  createCourse,
  getCourseWithSteps,
  reorderSteps,
  updateCourse,
  type CourseDifficulty,
  type PtCourse,
} from '@/lib/api/courses';
import { CourseStepEditor } from './CourseStepEditor';

const DIFFICULTY_OPTIONS: { value: CourseDifficulty; label: string }[] = [
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzato' },
];

interface CourseBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create mode */
  courseId: string | null;
  onSaved?: (course: PtCourse) => void;
}

export function CourseBuilder({ open, onOpenChange, courseId, onSaved }: CourseBuilderProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEdit = !!courseId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [targetExercise, setTargetExercise] = useState('');
  const [difficulty, setDifficulty] = useState<CourseDifficulty>('beginner');
  const [requiresSequential, setRequiresSequential] = useState(false);
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState('0');
  const [activeCourseId, setActiveCourseId] = useState<string | null>(courseId);

  const { data: course, isLoading: loadingCourse } = useQuery({
    queryKey: courseQueryKeys.detail(activeCourseId || ''),
    queryFn: () => getCourseWithSteps(activeCourseId!),
    enabled: open && !!activeCourseId,
  });

  useEffect(() => {
    if (!open) return;
    setActiveCourseId(courseId);
    if (!courseId) {
      setTitle('');
      setDescription('');
      setCoverImageUrl(null);
      setTargetExercise('');
      setDifficulty('beginner');
      setRequiresSequential(false);
      setIsFree(true);
      setPrice('0');
    }
  }, [open, courseId]);

  useEffect(() => {
    if (!course) return;
    setTitle(course.title || '');
    setDescription(course.description || '');
    setCoverImageUrl(course.cover_image_url);
    setTargetExercise(course.target_exercise || '');
    setDifficulty((course.difficulty_level as CourseDifficulty) || 'beginner');
    setRequiresSequential(!!course.requires_sequential_steps);
    setIsFree(course.is_free !== false);
    setPrice(String(course.price ?? 0));
  }, [course]);

  const invalidateList = () => {
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: courseQueryKeys.list(user.id) });
    }
  };

  const createMutation = useMutation({
    mutationFn: () => {
      if (!user?.id) throw new Error('Utente non autenticato');
      return createCourse({
        ptUserId: user.id,
        title,
        description,
        cover_image_url: coverImageUrl,
        target_exercise: targetExercise,
        difficulty_level: difficulty,
        requires_sequential_steps: requiresSequential,
        is_free: isFree,
        price: isFree ? 0 : Number(price) || 0,
      });
    },
    onSuccess: (created) => {
      setActiveCourseId(created.id);
      invalidateList();
      queryClient.invalidateQueries({ queryKey: courseQueryKeys.detail(created.id) });
      toast.success('Corso creato — ora aggiungi gli step');
      onSaved?.(created);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMetaMutation = useMutation({
    mutationFn: () => {
      if (!activeCourseId) throw new Error('Corso non trovato');
      return updateCourse(activeCourseId, {
        title,
        description,
        cover_image_url: coverImageUrl,
        target_exercise: targetExercise,
        difficulty_level: difficulty,
        requires_sequential_steps: requiresSequential,
        is_free: isFree,
        price: isFree ? 0 : Number(price) || 0,
      });
    },
    onSuccess: (updated) => {
      invalidateList();
      queryClient.invalidateQueries({ queryKey: courseQueryKeys.detail(updated.id) });
      toast.success('Corso aggiornato');
      onSaved?.(updated);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addStepMutation = useMutation({
    mutationFn: () => {
      if (!activeCourseId) throw new Error('Salva prima i dati del corso');
      const n = (course?.pt_course_steps?.length || 0) + 1;
      return addStep({
        courseId: activeCourseId,
        title: `Step ${n}`,
        completion_threshold: 100,
      });
    },
    onSuccess: () => {
      if (activeCourseId) {
        queryClient.invalidateQueries({ queryKey: courseQueryKeys.detail(activeCourseId) });
      }
      invalidateList();
      toast.success('Step aggiunto');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => {
      if (!activeCourseId) throw new Error('Corso non trovato');
      return reorderSteps(activeCourseId, orderedIds);
    },
    onSuccess: () => {
      if (activeCourseId) {
        queryClient.invalidateQueries({ queryKey: courseQueryKeys.detail(activeCourseId) });
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSaveMeta = () => {
    if (!title.trim()) {
      toast.error('Inserisci un titolo');
      return;
    }
    if (!isFree) {
      const parsed = Number(price);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        toast.error('Inserisci un prezzo valido maggiore di zero');
        return;
      }
    }
    if (!activeCourseId) createMutation.mutate();
    else updateMetaMutation.mutate();
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || !course?.pt_course_steps) return;
    const items = [...course.pt_course_steps];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    const orderedIds = items.map((s) => s.id);
    // Optimistic local cache
    queryClient.setQueryData(courseQueryKeys.detail(activeCourseId!), {
      ...course,
      pt_course_steps: items.map((s, i) => ({ ...s, order_index: i })),
    });
    reorderMutation.mutate(orderedIds);
  };

  const saving = createMutation.isPending || updateMetaMutation.isPending;
  const steps = course?.pt_course_steps || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{isEdit || activeCourseId ? 'Modifica corso' : 'Nuovo corso'}</DialogTitle>
          <DialogDescription>
            Definisci titolo, obiettivo e step con esercizi. Pubblica quando è pronto.
          </DialogDescription>
        </DialogHeader>

        {isEdit && loadingCourse && !course ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pr-1">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Copertina</Label>
                {coverImageUrl ? (
                  <div className="relative group rounded-lg overflow-hidden border border-border">
                    <img
                      src={coverImageUrl}
                      alt="Copertina corso"
                      className="w-full h-36 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {user?.id && (
                        <ImageUpload
                          bucket="cover-images"
                          filePath={`${user.id}/pt-courses/${Date.now()}.{ext}`}
                          onUploadComplete={(url) => setCoverImageUrl(url)}
                          variant="inline"
                        >
                          <Button type="button" size="sm" variant="secondary">
                            <ImagePlus className="h-4 w-4 mr-1" />
                            Cambia
                          </Button>
                        </ImageUpload>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => setCoverImageUrl(null)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Rimuovi
                      </Button>
                    </div>
                  </div>
                ) : user?.id ? (
                  <ImageUpload
                    bucket="cover-images"
                    filePath={`${user.id}/pt-courses/${Date.now()}.{ext}`}
                    onUploadComplete={(url) => setCoverImageUrl(url)}
                    variant="gallery"
                    className="h-28"
                  />
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="course-title">Titolo *</Label>
                <Input
                  id="course-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Es. Percorso Muscle-up"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="course-desc">Descrizione</Label>
                <Textarea
                  id="course-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Di cosa tratta il corso e a chi è rivolto"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="course-target">Esercizio obiettivo</Label>
                  <Input
                    id="course-target"
                    value={targetExercise}
                    onChange={(e) => setTargetExercise(e.target.value)}
                    placeholder="Es. Muscle-up"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Difficoltà</Label>
                  <Select
                    value={difficulty}
                    onValueChange={(v) => setDifficulty(v as CourseDifficulty)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">Step in sequenza</p>
                  <p className="text-xs text-muted-foreground">
                    L&apos;atleta deve completare gli step nell&apos;ordine indicato
                  </p>
                </div>
                <Switch
                  checked={requiresSequential}
                  onCheckedChange={setRequiresSequential}
                />
              </div>

              <div className="space-y-3 rounded-lg border border-border px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Corso gratuito</p>
                    <p className="text-xs text-muted-foreground">
                      Se disattivo, gli atleti non possono iscriversi da soli finché non
                      assegni il corso
                    </p>
                  </div>
                  <Switch checked={isFree} onCheckedChange={setIsFree} />
                </div>
                {!isFree ? (
                  <div className="space-y-2">
                    <Label htmlFor="course-price">Prezzo (€)</Label>
                    <Input
                      id="course-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="29.90"
                    />
                  </div>
                ) : null}
              </div>
            </div>

            {activeCourseId && (
              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Step del corso</h3>
                    <p className="text-xs text-muted-foreground">
                      Trascina per riordinare · {steps.length} step
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addStepMutation.mutate()}
                    disabled={addStepMutation.isPending}
                  >
                    {addStepMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5 mr-1" />
                    )}
                    Aggiungi step
                  </Button>
                </div>

                {steps.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
                    Nessuno step ancora. Aggiungine uno per strutturare il percorso.
                  </p>
                ) : (
                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="course-steps">
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="space-y-3"
                        >
                          {steps.map((step, index) => (
                            <Draggable key={step.id} draggableId={step.id} index={index}>
                              {(dragProvided, snapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  className={snapshot.isDragging ? 'opacity-90' : undefined}
                                >
                                  <CourseStepEditor
                                    courseId={activeCourseId}
                                    step={step}
                                    dragHandleProps={dragProvided.dragHandleProps || undefined}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="border-t border-border pt-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Chiudi
          </Button>
          {!(isEdit && loadingCourse && !course) && (
            <Button type="button" onClick={handleSaveMeta} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {activeCourseId ? 'Salva dati corso' : 'Crea corso'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
