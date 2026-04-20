import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Dumbbell,
} from 'lucide-react';
import { ImageUpload } from '@/components/common/ImageUpload';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

// =====================================================
// TEMPLATE EXERCISE BUILDER
// Aggiunge esercizi a un template con configurazione
// =====================================================

interface Exercise {
  id: string;
  name: string;
  category: string;
  muscle_groups: string[];
  difficulty_level: string;
  video_url: string | null;
  image_url: string | null;
}

interface TemplateExercise {
  id: string;
  exercise_id: string;
  order_index: number;
  sets: number;
  reps_min: number | null;
  reps_max: number | null;
  rest_seconds: number | null;
  notes: string | null;
  tempo: string | null;
  prescribed_duration_seconds?: number | null;
  exercise?: Exercise;
}

interface TemplateExerciseBuilderProps {
  templateId: string;
  blockId?: string | null; // se presente, scope esercizi al blocco
  // Parametri ereditati dal blocco (per protocolli come SET dove i parametri
  // sono definiti a livello di blocco e applicati a ciascun esercizio).
  blockParams?: {
    sets?: number | null;
    reps?: number | null;
    duration_seconds?: number | null;
    rest_seconds?: number | null;
    weight?: number | null;
  } | null;
  blockType?: string | null;
  onSave?: () => void;
}

export function TemplateExerciseBuilder({ templateId, blockId, blockParams, blockType, onSave }: TemplateExerciseBuilderProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Cache key — separato per blocco
  const queryKey = ['template-exercises', templateId, blockId ?? 'no-block'];

  // Fetch all exercises
  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises-library'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .or('is_public.eq.true,created_by.is.null')
        .order('name');
      
      if (error) throw error;
      return data as Exercise[];
    },
  });

  // Fetch template exercises (filtrati per block_id se presente)
  const { data: templateExercises = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let q = supabase
        .from('template_exercises')
        .select(`
          id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes, tempo, block_id, prescribed_duration_seconds,
          exercises (*)
        `)
        .eq('template_id', templateId)
        .order('order_index');

      if (blockId) {
        q = q.eq('block_id', blockId);
      } else {
        q = q.is('block_id', null);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data.map(te => ({
        ...te,
        exercise: te.exercises
      })) as TemplateExercise[];
    },
    enabled: !!templateId,
  });

  // Add exercise mutation — eredita params dal blocco se presenti (es. SET)
  const addExerciseMutation = useMutation({
    mutationFn: async (exercise: Exercise) => {
      const maxOrder = templateExercises.length > 0 
        ? Math.max(...templateExercises.map(te => te.order_index)) + 1 
        : 0;

      const sets = blockParams?.sets ?? 3;
      const repsVal = blockParams?.reps ?? null;
      const dur = blockParams?.duration_seconds ?? null;
      const rest = blockParams?.rest_seconds ?? 60;

      const { error } = await supabase
        .from('template_exercises')
        .insert({
          template_id: templateId,
          exercise_id: exercise.id,
          order_index: maxOrder,
          sets,
          // se il blocco usa tempo, lascia reps a null e viceversa
          reps_min: dur != null ? null : (repsVal ?? 10),
          reps_max: dur != null ? null : (repsVal ? null : 12),
          rest_seconds: rest,
          prescribed_duration_seconds: dur,
          block_id: blockId ?? null,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['template-blocks', templateId] });
      toast.success('Esercizio aggiunto');
      setSearchOpen(false);
    },
    onError: () => {
      toast.error('Errore durante l\'aggiunta');
    },
  });

  // Update exercise mutation
  const updateExerciseMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; sets?: number; reps_min?: number; reps_max?: number; rest_seconds?: number; notes?: string | null; tempo?: string | null }) => {
      const { error } = await supabase
        .from('template_exercises')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Remove exercise mutation
  const removeExerciseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('template_exercises')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['template-blocks', templateId] });
      toast.success('Esercizio rimosso');
    },
    onError: () => {
      toast.error('Errore durante la rimozione');
    },
  });

  // Reorder mutation for drag and drop
  const reorderMutation = useMutation({
    mutationFn: async (reorderedExercises: { id: string; order_index: number }[]) => {
      // Update all exercises with new order indices
      const updates = reorderedExercises.map(({ id, order_index }) =>
        supabase.from('template_exercises').update({ order_index }).eq('id', id)
      );
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => {
      toast.error('Errore durante il riordinamento');
    },
  });

  // Handle drag end
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    // Create a new array with the reordered items
    const reordered = Array.from(templateExercises);
    const [removed] = reordered.splice(sourceIndex, 1);
    reordered.splice(destinationIndex, 0, removed);

    // Update order indices
    const updates = reordered.map((item, index) => ({
      id: item.id,
      order_index: index,
    }));

    // Optimistically update the cache
    queryClient.setQueryData(queryKey,
      reordered.map((item, index) => ({ ...item, order_index: index }))
    );

    // Persist to database
    reorderMutation.mutate(updates);
  };

  // Filter exercises not already in template
  const availableExercises = exercises.filter(
    ex => !templateExercises.some(te => te.exercise_id === ex.id)
  );

  const filteredExercises = availableExercises.filter(ex =>
    ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group exercises by category
  const groupedExercises = filteredExercises.reduce((acc, ex) => {
    if (!acc[ex.category]) acc[ex.category] = [];
    acc[ex.category].push(ex);
    return acc;
  }, {} as Record<string, Exercise[]>);

  return (
    <div className="space-y-4">
      {/* Add Exercise Button */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">Esercizi nel Template</h4>
          <p className="text-sm text-muted-foreground">
            {templateExercises.length} esercizi configurati • Trascina per riordinare
          </p>
        </div>
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Esercizio
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="end">
            <Command shouldFilter={false}>
              <CommandInput 
                placeholder="Cerca esercizio..." 
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
              <CommandList>
                <CommandEmpty>Nessun esercizio trovato</CommandEmpty>
                {Object.entries(groupedExercises).map(([category, exs]) => (
                  <CommandGroup key={category} heading={category}>
                    {exs.map((exercise) => (
                      <CommandItem
                        key={exercise.id}
                        onSelect={() => addExerciseMutation.mutate(exercise)}
                        className="cursor-pointer"
                      >
                        <Dumbbell className="h-4 w-4 mr-2" />
                        <div className="flex-1">
                          <p className="font-medium">{exercise.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {exercise.muscle_groups.join(', ')}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">
                          {exercise.difficulty_level}
                        </Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Exercise List with Drag and Drop */}
      {templateExercises.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Nessun esercizio nel template. Inizia aggiungendo il primo!
            </p>
          </CardContent>
        </Card>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="template-exercises">
            {(provided, snapshot) => (
              <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    "space-y-3 min-h-[80px] transition-colors rounded-lg p-1",
                    snapshot.isDraggingOver && "bg-accent/50"
                  )}
                >
                  {templateExercises.map((te, index) => (
                    <Draggable key={te.id} draggableId={te.id} index={index}>
                      {(provided, snapshot) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            "overflow-hidden transition-shadow",
                            snapshot.isDragging && "shadow-lg ring-2 ring-primary"
                          )}
                        >
                          <CardContent className="p-4">
                            <div className="flex gap-4">
                              {/* Drag Handle */}
                              <div
                                {...provided.dragHandleProps}
                                className="flex flex-col items-center justify-center gap-1 cursor-grab active:cursor-grabbing"
                              >
                                <GripVertical className="h-5 w-5 text-muted-foreground" />
                                <span className="text-sm font-medium text-muted-foreground">
                                  {index + 1}
                                </span>
                              </div>

                              {/* Exercise Info */}
                              <div className="flex-1 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">{te.exercise?.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {te.exercise?.category} • {te.exercise?.muscle_groups.join(', ')}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => removeExerciseMutation.mutate(te.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>

                                {/* Configuration */}
                                <div className="grid grid-cols-4 gap-3">
                                  <div className="space-y-1">
                                    <Label className="text-xs">Serie</Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={te.sets}
                                      onChange={(e) => updateExerciseMutation.mutate({
                                        id: te.id,
                                        sets: parseInt(e.target.value) || 3
                                      })}
                                      className="h-8"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Reps Min</Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={te.reps_min ?? ''}
                                      onChange={(e) => updateExerciseMutation.mutate({
                                        id: te.id,
                                        reps_min: parseInt(e.target.value) || null
                                      })}
                                      className="h-8"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Reps Max</Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={te.reps_max ?? ''}
                                      onChange={(e) => updateExerciseMutation.mutate({
                                        id: te.id,
                                        reps_max: parseInt(e.target.value) || null
                                      })}
                                      className="h-8"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Recupero (s)</Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      step={15}
                                      value={te.rest_seconds ?? 60}
                                      onChange={(e) => updateExerciseMutation.mutate({
                                        id: te.id,
                                        rest_seconds: parseInt(e.target.value) || 60
                                      })}
                                      className="h-8"
                                    />
                                  </div>
                                </div>

                                {/* Tempo field - 4 inputs for cadence */}
                                <div className="space-y-1">
                                  <Label className="text-xs">Tempo (cadenza movimento)</Label>
                                  <div className="flex items-center gap-1">
                                    {(() => {
                                      const tempoParts = (te.tempo || '').split('-');
                                      const labels = ['Ecc.', 'Pausa', 'Conc.', 'Pausa'];
                                      return labels.map((label, i) => (
                                        <div key={i} className="flex-1">
                                          <Input
                                            type="number"
                                            min={0}
                                            max={9}
                                            placeholder="0"
                                            value={tempoParts[i] || ''}
                                            onChange={(e) => {
                                              const newParts = [...(te.tempo || '0-0-0-0').split('-')];
                                              while (newParts.length < 4) newParts.push('0');
                                              newParts[i] = e.target.value || '0';
                                              updateExerciseMutation.mutate({
                                                id: te.id,
                                                tempo: newParts.join('-')
                                              });
                                            }}
                                            className="h-8 text-center px-1"
                                          />
                                          <span className="text-[10px] text-muted-foreground text-center block mt-0.5">{label}</span>
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">Es: 3-1-2-0 = 3s discesa, 1s pausa, 2s risalita, 0s pausa</p>
                                </div>

                                {/* Notes field */}
                                <div className="space-y-1">
                                  <Label className="text-xs">Note e istruzioni</Label>
                                  <Textarea
                                    placeholder="Aggiungi istruzioni specifiche per l'atleta..."
                                    value={te.notes ?? ''}
                                    onChange={(e) => updateExerciseMutation.mutate({
                                      id: te.id,
                                      notes: e.target.value || null
                                    })}
                                    className="min-h-[60px] text-sm resize-none"
                                  />
                                </div>

                                {/* Exercise image upload */}
                                {user?.id && (
                                  <div className="space-y-1">
                                    <Label className="text-xs">Foto esercizio</Label>
                                    <div className="flex items-center gap-3">
                                      {te.exercise?.image_url && (
                                        <img src={te.exercise.image_url} alt="" className="h-12 w-12 rounded object-cover" />
                                      )}
                                      <ImageUpload
                                        bucket="exercise-images"
                                        filePath={`${user.id}/${te.exercise_id}.{ext}`}
                                        currentUrl={te.exercise?.image_url}
                                        onUploadComplete={async (url) => {
                                          const { error } = await supabase
                                            .from('exercises')
                                            .update({ image_url: url })
                                            .eq('id', te.exercise_id);
                                          if (error) {
                                            toast.error("Errore upload immagine");
                                          } else {
                                            queryClient.invalidateQueries({ queryKey: ['template-exercises', templateId] });
                                            toast.success('Immagine esercizio aggiornata');
                                          }
                                        }}
                                        variant="inline"
                                      />
                                    </div>
                                  </div>
                                )}

                              </div>
                            </div>
                          </CardContent>
                        </Card>
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
  );
}

export default TemplateExerciseBuilder;
