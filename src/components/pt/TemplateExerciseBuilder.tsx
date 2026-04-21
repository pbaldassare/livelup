import { useState, useMemo } from 'react';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Trash2,
  GripVertical,
  Dumbbell,
  ChevronDown,
  MoveRight,
} from 'lucide-react';
import { ImageUpload } from '@/components/common/ImageUpload';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  resolveSetsData,
  summarizeSets,
  DEFAULT_SET,
  type SetItem,
} from '@/lib/setsData';
import {
  PROTOCOL_LIST,
  getProtocolDef,
  getDefaultParamsForProtocol,
  getNested,
  setNested,
  type ProtocolType,
  type ProtocolParams,
} from '@/lib/protocols/registry';
import { ProtocolInfoPopover } from '@/components/protocols/ProtocolInfoPopover';

// =====================================================
// TEMPLATE EXERCISE BUILDER
// Aggiunge esercizi a un template (singoli o dentro un circuito).
// Ogni esercizio ha il PROPRIO protocollo (SET di default) e i propri set.
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
  sets_data?: any;
  protocol_type?: string | null;
  protocol_params?: any;
  block_id?: string | null;
  exercise?: Exercise;
}

interface TemplateExerciseBuilderProps {
  templateId: string;
  blockId?: string | null; // null = esercizi fuori circuito
  onSave?: () => void;
}

export function TemplateExerciseBuilder({ templateId, blockId, onSave }: TemplateExerciseBuilderProps) {
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
          id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes, tempo, block_id, prescribed_duration_seconds, sets_data,
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

  // Add exercise mutation — eredita params dal blocco e materializza sets_data
  const addExerciseMutation = useMutation({
    mutationFn: async (exercise: Exercise) => {
      const maxOrder = templateExercises.length > 0
        ? Math.max(...templateExercises.map((te) => te.order_index)) + 1
        : 0;

      const sets = blockParams?.sets ?? 3;
      const repsVal = blockParams?.reps ?? null;
      const dur = blockParams?.duration_seconds ?? null;
      const rest = blockParams?.rest_seconds ?? 60;
      const weight = blockParams?.weight ?? null;

      // Genera sets_data con N copie dai default del blocco
      const sets_data: SetItem[] = Array.from({ length: Math.max(1, sets) }).map(() => ({
        reps: dur != null ? null : (repsVal ?? 10),
        weight: weight ?? null,
        rest_seconds: rest,
      }));

      const { error } = await supabase
        .from('template_exercises')
        .insert({
          template_id: templateId,
          exercise_id: exercise.id,
          order_index: maxOrder,
          sets,
          reps_min: dur != null ? null : (repsVal ?? 10),
          reps_max: dur != null ? null : (repsVal ? null : 12),
          rest_seconds: rest,
          prescribed_duration_seconds: dur,
          sets_data: sets_data as any,
          block_id: blockId ?? null,
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['template-blocks', templateId] });
      toast.success('Esercizio aggiunto');
      setSearchOpen(false);
    },
    onError: () => {
      toast.error("Errore durante l'aggiunta");
    },
  });

  // Update exercise (campi piatti / note / tempo)
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

  // Mutation per aggiornare i sets_data (set eterogenei) + riassunto nei campi piatti
  const updateSetsMutation = useMutation({
    mutationFn: async ({ id, sets_data }: { id: string; sets_data: SetItem[] }) => {
      const summary = summarizeSets(sets_data);
      const { error } = await supabase
        .from('template_exercises')
        .update({
          sets_data: sets_data as any,
          sets: summary.sets,
          reps_min: summary.reps_min,
          reps_max: summary.reps_max,
          rest_seconds: summary.rest_seconds,
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, sets_data }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<TemplateExercise[]>(queryKey);
      queryClient.setQueryData<TemplateExercise[]>(queryKey, (old) =>
        (old || []).map((te) => (te.id === id ? { ...te, sets_data } : te)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
      toast.error('Errore aggiornamento set');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
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

                                {/* Tabella SET orizzontale (set eterogenei) */}
                                <SetsTable
                                  te={te}
                                  onChange={(sets_data) =>
                                    updateSetsMutation.mutate({ id: te.id, sets_data })
                                  }
                                />

                                {/* Avanzate: tempo + note (collassate) */}
                                <Collapsible>
                                  <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                                      <ChevronDown className="h-3 w-3" />
                                      Mostra avanzate (tempo, note)
                                    </Button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="space-y-3 pt-2">
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
                                                    tempo: newParts.join('-'),
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

                                    <div className="space-y-1">
                                      <Label className="text-xs">Note e istruzioni</Label>
                                      <Textarea
                                        placeholder="Aggiungi istruzioni specifiche per l'atleta..."
                                        value={te.notes ?? ''}
                                        onChange={(e) => updateExerciseMutation.mutate({
                                          id: te.id,
                                          notes: e.target.value || null,
                                        })}
                                        className="min-h-[60px] text-sm resize-none"
                                      />
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>

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

// =====================================================
// SetsTable: tabella orizzontale per set eterogenei
// =====================================================
interface SetsTableProps {
  te: TemplateExercise;
  onChange: (sets_data: SetItem[]) => void;
}

function SetsTable({ te, onChange }: SetsTableProps) {
  const sets = useMemo<SetItem[]>(
    () =>
      resolveSetsData(te.sets_data, {
        sets: te.sets,
        reps_min: te.reps_min,
        reps_max: te.reps_max,
        rest_seconds: te.rest_seconds,
        prescribed_duration_seconds: te.prescribed_duration_seconds,
      }),
    [te.sets_data, te.sets, te.reps_min, te.reps_max, te.rest_seconds, te.prescribed_duration_seconds],
  );

  const updateSet = (idx: number, patch: Partial<SetItem>) => {
    const next = sets.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange(next);
  };

  const addSet = () => {
    const last = sets[sets.length - 1] ?? DEFAULT_SET;
    onChange([...sets, { ...last }]);
  };

  const removeSet = (idx: number) => {
    if (sets.length <= 1) {
      toast.warning('Deve esserci almeno 1 set');
      return;
    }
    onChange(sets.filter((_, i) => i !== idx));
  };

  const parseNum = (v: string): number | null => {
    if (v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">Set</span>
        <Button variant="outline" size="sm" className="h-7 gap-1" onClick={addSet}>
          <Plus className="h-3 w-3" /> Set
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left font-medium text-muted-foreground pr-2 py-1 sticky left-0 bg-muted/20"></th>
              {sets.map((_, i) => (
                <th key={i} className="px-1 py-1 text-center font-medium text-muted-foreground min-w-[64px]">
                  Set {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="pr-2 py-1 text-muted-foreground sticky left-0 bg-muted/20">Reps</td>
              {sets.map((s, i) => (
                <td key={i} className="px-1 py-1">
                  <Input
                    type="number"
                    min="0"
                    value={s.reps ?? ''}
                    onChange={(e) => updateSet(i, { reps: parseNum(e.target.value) })}
                    className="h-8 text-center px-1"
                  />
                </td>
              ))}
            </tr>
            <tr>
              <td className="pr-2 py-1 text-muted-foreground sticky left-0 bg-muted/20">Kg</td>
              {sets.map((s, i) => (
                <td key={i} className="px-1 py-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={s.weight ?? ''}
                    onChange={(e) => updateSet(i, { weight: parseNum(e.target.value) })}
                    className="h-8 text-center px-1"
                  />
                </td>
              ))}
            </tr>
            <tr>
              <td className="pr-2 py-1 text-muted-foreground sticky left-0 bg-muted/20">Rec (s)</td>
              {sets.map((s, i) => (
                <td key={i} className="px-1 py-1">
                  <Input
                    type="number"
                    min="0"
                    value={s.rest_seconds ?? ''}
                    onChange={(e) => updateSet(i, { rest_seconds: parseNum(e.target.value) })}
                    className="h-8 text-center px-1"
                  />
                </td>
              ))}
            </tr>
            <tr>
              <td className="sticky left-0 bg-muted/20"></td>
              {sets.map((_, i) => (
                <td key={i} className="px-1 py-1 text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => removeSet(i)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
