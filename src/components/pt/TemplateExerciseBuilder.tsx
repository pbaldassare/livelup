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
import { Switch } from '@/components/ui/switch';
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
  resolveRampingUnit,
  type ProtocolType,
  type ProtocolParams,
} from '@/lib/protocols/registry';
import { ProtocolInfoPopover } from '@/components/protocols/ProtocolInfoPopover';
import { EmomBlocksEditor } from '@/components/pt/protocols/EmomBlocksEditor';
import { AmrapEditor } from '@/components/pt/protocols/AmrapEditor';
import { SupersetEditor } from '@/components/pt/protocols/SupersetEditor';
import { normalizeAmrapParams } from '@/lib/protocols/amrap';
import { normalizeSupersetParams } from '@/lib/protocols/superset';
import { normalizeEmomParams } from '@/lib/protocols/emom';
import { useFavoriteIds } from '@/hooks/usePTFavoriteExercises';
import { Link } from 'react-router-dom';

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

  // Fetch only PT's favorite exercises
  const { data: favIds } = useFavoriteIds();
  const { data: exercises = [] } = useQuery({
    queryKey: ['template-exercises-library', user?.id, favIds ? Array.from(favIds).sort().join(',') : ''],
    queryFn: async () => {
      const ids = favIds ? Array.from(favIds) : [];
      if (ids.length === 0) return [] as Exercise[];
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .in('id', ids)
        .order('name');
      if (error) throw error;
      return data as Exercise[];
    },
    enabled: !!user?.id && !!favIds,
  });

  // Fetch template exercises (filtrati per block_id se presente)
  const { data: templateExercises = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let q = supabase
        .from('template_exercises')
        .select(`
          id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes, tempo, block_id, prescribed_duration_seconds, sets_data, protocol_type, protocol_params,
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

  // Lista circuiti del template (per il menu "Sposta in...")
  const { data: allCircuits = [] } = useQuery({
    queryKey: ['template-blocks', templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('template_blocks')
        .select('id, name, order_index')
        .eq('template_id', templateId)
        .order('order_index');
      if (error) throw error;
      return data || [];
    },
    enabled: !!templateId,
  });

  // Lista COMPLETA degli esercizi del template (tutti i blocchi/circuiti).
  // Usata per popolare il dropdown EMOM, indipendentemente dal block_id corrente.
  const { data: allTemplateExerciseOptions = [] } = useQuery({
    queryKey: ['template-exercise-options', templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('template_exercises')
        .select('exercise_id, exercises ( id, name )')
        .eq('template_id', templateId);
      if (error) throw error;
      const seen = new Set<string>();
      const out: { id: string; name: string }[] = [];
      for (const row of (data ?? []) as any[]) {
        const name: string = row.exercises?.name ?? '';
        const id: string = row.exercise_id;
        const key = name.trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push({ id, name });
      }
      return out;
    },
    enabled: !!templateId,
  });

  // Add exercise mutation — default SET, 3 set generici
  const addExerciseMutation = useMutation({
    mutationFn: async (exercise: Exercise) => {
      const maxOrder = templateExercises.length > 0
        ? Math.max(...templateExercises.map((te) => te.order_index)) + 1
        : 0;

      const sets = 3;
      const repsVal = 10;
      const rest = 60;

      const sets_data: SetItem[] = Array.from({ length: sets }).map(() => ({
        reps: repsVal,
        weight: null,
        rest_seconds: rest,
      }));

      const { error } = await supabase
        .from('template_exercises')
        .insert({
          template_id: templateId,
          exercise_id: exercise.id,
          order_index: maxOrder,
          sets,
          reps_min: repsVal,
          reps_max: null,
          rest_seconds: rest,
          prescribed_duration_seconds: null,
          sets_data: sets_data as any,
          block_id: blockId ?? null,
          protocol_type: 'SET',
          protocol_params: {},
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['template-blocks', templateId] });
      queryClient.invalidateQueries({ queryKey: ['template-blocks-counts', templateId] });
      queryClient.invalidateQueries({ queryKey: ['template-exercise-options', templateId] });
      toast.success('Esercizio aggiunto');
      setSearchOpen(false);
    },
    onError: () => {
      toast.error("Errore durante l'aggiunta");
    },
  });

  // Cambio protocollo per esercizio: aggiorna protocol_type e azzera/riprenseta protocol_params
  const updateProtocolMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: ProtocolType }) => {
      const params = getDefaultParamsForProtocol(type);
      const { error } = await supabase
        .from('template_exercises')
        .update({ protocol_type: type, protocol_params: params as any } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast.error('Errore aggiornamento protocollo'),
  });

  // Aggiorna un parametro del protocol_params (per protocolli non-SET)
  const updateProtocolParamMutation = useMutation({
    mutationFn: async ({ id, params }: { id: string; params: any }) => {
      const { error } = await supabase
        .from('template_exercises')
        .update({ protocol_params: params } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  // Sposta esercizio in un altro circuito (o fuori circuito)
  const moveToCircuitMutation = useMutation({
    mutationFn: async ({ id, targetBlockId }: { id: string; targetBlockId: string | null }) => {
      const { error } = await supabase
        .from('template_exercises')
        .update({ block_id: targetBlockId } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-exercises', templateId] });
      queryClient.invalidateQueries({ queryKey: ['template-blocks-counts', templateId] });
      toast.success('Esercizio spostato');
    },
    onError: () => toast.error('Errore spostamento'),
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
      queryClient.invalidateQueries({ queryKey: ['template-exercise-options', templateId] });
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
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground">
            {templateExercises.length} esercizi {blockId ? 'nel circuito' : 'liberi'} • Trascina per riordinare
          </p>
        </div>
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button size={blockId ? 'sm' : 'default'}>
              <Plus className="h-4 w-4 mr-2" />
              {blockId ? 'Aggiungi al circuito' : 'Aggiungi esercizio'}
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
                {exercises.length === 0 ? (
                  <div className="py-6 px-4 text-center space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Non hai ancora esercizi preferiti.
                    </p>
                    <Link
                      to="/pt/exercises"
                      onClick={() => setSearchOpen(false)}
                      className="inline-block text-sm font-medium text-primary hover:underline"
                    >
                      Vai all'Archivio →
                    </Link>
                  </div>
                ) : (
                  <CommandEmpty>Nessun esercizio trovato</CommandEmpty>
                )}
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
        <div className="py-6 text-center text-sm text-muted-foreground">
          {blockId
            ? 'Circuito vuoto. Aggiungi il primo esercizio.'
            : 'Nessun esercizio libero. Aggiungi il primo o crea un circuito.'}
        </div>
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
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="font-medium truncate">{te.exercise?.name}</p>
                                    <p className="text-sm text-muted-foreground truncate">
                                      {te.exercise?.category} • {te.exercise?.muscle_groups.join(', ')}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {/* Selettore Protocollo */}
                                    <Select
                                      value={(te.protocol_type as ProtocolType) || 'SET'}
                                      onValueChange={(v) =>
                                        updateProtocolMutation.mutate({ id: te.id, type: v as ProtocolType })
                                      }
                                    >
                                      <SelectTrigger className="h-8 w-[140px] text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {PROTOCOL_LIST.map((def) => {
                                          const Icon = def.icon;
                                          return (
                                            <SelectItem key={def.type} value={def.type}>
                                              <span className="flex items-center gap-2">
                                                <Icon className="h-3.5 w-3.5" />
                                                {def.label}
                                              </span>
                                            </SelectItem>
                                          );
                                        })}
                                      </SelectContent>
                                    </Select>
                                    <ProtocolInfoPopover type={(te.protocol_type as ProtocolType) || 'SET'} />
                                    {/* Sposta in... */}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" title="Sposta esercizio">
                                          <MoveRight className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Sposta in</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          disabled={!te.block_id}
                                          onClick={() =>
                                            moveToCircuitMutation.mutate({ id: te.id, targetBlockId: null })
                                          }
                                        >
                                          Esercizi singoli
                                        </DropdownMenuItem>
                                        {allCircuits.map((c: any) => (
                                          <DropdownMenuItem
                                            key={c.id}
                                            disabled={te.block_id === c.id}
                                            onClick={() =>
                                              moveToCircuitMutation.mutate({
                                                id: te.id,
                                                targetBlockId: c.id,
                                              })
                                            }
                                          >
                                            {c.name || 'Circuito'}
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => removeExerciseMutation.mutate(te.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Render condizionale per protocollo */}
                                {(() => {
                                  const ptype = ((te.protocol_type as ProtocolType) || 'SET');
                                  if (ptype === 'SET') {
                                    return (
                                      <SetsTable
                                        te={te}
                                        onChange={(sets_data) =>
                                          updateSetsMutation.mutate({ id: te.id, sets_data })
                                        }
                                      />
                                    );
                                  }
                                  if (ptype === 'TOP_SET_BACKOFF') {
                                    const rawParams = (te.protocol_params as any) || {};
                                    const params = normalizeTopSetBackoff(rawParams);
                                    const backoffEnabled = params.backoff_enabled !== false;

                                    const commit = (next: any) => {
                                      updateProtocolParamMutation.mutate({ id: te.id, params: next });
                                    };

                                    const updateParam = (
                                      key: 'top_sets' | 'top_reps' | 'top_rest' | 'top_increase_percent' | 'top_kg' | 'backoff_enabled' | 'backoff_sets' | 'backoff_reps' | 'backoff_percentage' | 'backoff_kg',
                                      value: number | boolean | null,
                                    ) => {
                                      const next = applyParamSync(params, key, value);
                                      commit(next);
                                    };

                                    const updateTopSetCell = (idx: number, patch: Partial<SetItem> & { weight_is_manual?: boolean }) => {
                                      const top_set_data = params.top_set_data.map((s, i) =>
                                        i === idx ? { ...s, ...patch } : s,
                                      );
                                      commit({ ...params, top_set_data });
                                    };
                                    const updateBackoffCell = (idx: number, patch: Partial<SetItem> & { weight_is_manual?: boolean }) => {
                                      const backoff_data = params.backoff_data.map((s, i) =>
                                        i === idx ? { ...s, ...patch } : s,
                                      );
                                      commit({ ...params, backoff_data });
                                    };

                                    return (
                                      <div className="space-y-3">
                                        <div className="rounded-md border bg-muted/20 p-3 space-y-3">
                                          <p className="text-xs font-medium text-muted-foreground">
                                            Parametri Top Set + Back Off
                                          </p>
                                          {/* Top Set */}
                                          <div className="space-y-2">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/80">Top Set</p>
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                              <div className="space-y-1">
                                                <Label className="text-xs">Serie</Label>
                                                <Input
                                                  type="number"
                                                  min={1}
                                                  placeholder="1"
                                                  value={params.top_sets ?? ''}
                                                  onChange={(e) => updateParam('top_sets', e.target.value === '' ? null : Number(e.target.value))}
                                                  className="h-8"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <Label className="text-xs">Reps</Label>
                                                <Input
                                                  type="number"
                                                  min={1}
                                                  placeholder="5"
                                                  value={params.top_reps ?? ''}
                                                  onChange={(e) => updateParam('top_reps', e.target.value === '' ? null : Number(e.target.value))}
                                                  className="h-8"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <Label className="text-xs">Recupero (s)</Label>
                                                <Input
                                                  type="number"
                                                  min={0}
                                                  step={15}
                                                  placeholder="120"
                                                  value={params.top_rest ?? ''}
                                                  onChange={(e) => updateParam('top_rest', e.target.value === '' ? null : Number(e.target.value))}
                                                  className="h-8"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <Label className="text-xs">Kg</Label>
                                                <Input
                                                  type="number"
                                                  min={0}
                                                  step={0.5}
                                                  placeholder="—"
                                                  value={params.top_kg ?? ''}
                                                  onChange={(e) => updateParam('top_kg', e.target.value === '' ? null : Number(e.target.value))}
                                                  className="h-8"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <Label className="text-xs">Aumento %</Label>
                                                <Input
                                                  type="number"
                                                  min={0}
                                                  max={100}
                                                  step={0.5}
                                                  placeholder="5"
                                                  value={params.top_increase_percent ?? ''}
                                                  onChange={(e) => updateParam('top_increase_percent', e.target.value === '' ? null : Number(e.target.value))}
                                                  className="h-8"
                                                />
                                              </div>
                                            </div>
                                          </div>
                                          {/* Back Off toggle */}
                                          <div className="flex items-center justify-between rounded-md border border-border/60 bg-background/50 px-3 py-2">
                                            <div>
                                              <p className="text-xs font-semibold">Back Off</p>
                                              <p className="text-[10px] text-muted-foreground">Serie di scarico a carico ridotto</p>
                                            </div>
                                            <Switch
                                              checked={backoffEnabled}
                                              onCheckedChange={(checked) => updateParam('backoff_enabled', checked)}
                                            />
                                          </div>
                                          {/* Back Off params */}
                                          {backoffEnabled && (
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                              <div className="space-y-1">
                                                <Label className="text-xs">Serie</Label>
                                                <Input
                                                  type="number"
                                                  min={1}
                                                  placeholder="3"
                                                  value={params.backoff_sets ?? ''}
                                                  onChange={(e) => updateParam('backoff_sets', e.target.value === '' ? null : Number(e.target.value))}
                                                  className="h-8"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <Label className="text-xs">Reps</Label>
                                                <Input
                                                  type="number"
                                                  min={1}
                                                  placeholder="8"
                                                  value={params.backoff_reps ?? ''}
                                                  onChange={(e) => updateParam('backoff_reps', e.target.value === '' ? null : Number(e.target.value))}
                                                  className="h-8"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <Label className="text-xs">Kg</Label>
                                                <Input
                                                  type="number"
                                                  min={0}
                                                  step={0.5}
                                                  placeholder="—"
                                                  value={params.backoff_kg ?? ''}
                                                  onChange={(e) => updateParam('backoff_kg', e.target.value === '' ? null : Number(e.target.value))}
                                                  className="h-8"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <Label className="text-xs">% riduzione</Label>
                                                <Input
                                                  type="number"
                                                  min={1}
                                                  max={90}
                                                  placeholder="20"
                                                  value={params.backoff_percentage ?? ''}
                                                  onChange={(e) => updateParam('backoff_percentage', e.target.value === '' ? null : Number(e.target.value))}
                                                  className="h-8"
                                                />
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        {/* Tabella Top Set */}
                                        <TopSetBackoffTable
                                          title="Top Set"
                                          sets={params.top_set_data}
                                          onCellChange={updateTopSetCell}
                                        />

                                        {/* Tabella Back Off */}
                                        {backoffEnabled && (
                                          <TopSetBackoffTable
                                            title="Back Off"
                                            sets={params.backoff_data}
                                            onCellChange={updateBackoffCell}
                                          />
                                        )}
                                      </div>
                                    );
                                  }
                                  // Protocolli non-set-based: render dei paramFields
                                  const def = getProtocolDef(ptype);
                                  const params = (te.protocol_params as ProtocolParams) || {};

                                  // EMOM: editor a blocchi dedicato (override della form generica)
                                  if (ptype === 'EMOM') {
                                    const fallbackName =
                                      exercises.find((e) => e.id === te.exercise_id)?.name;
                                    const emomValue = normalizeEmomParams(
                                      params as Record<string, unknown>,
                                      fallbackName,
                                    );
                                    // Opzioni dropdown = TUTTI gli esercizi del template (qualsiasi blocco)
                                    const exerciseSuggestions = allTemplateExerciseOptions;
                                    return (
                                      <EmomBlocksEditor
                                        value={emomValue}
                                        exerciseOptions={exerciseSuggestions}
                                        onChange={(next) => {
                                          updateProtocolParamMutation.mutate({
                                            id: te.id,
                                            params: next as unknown as ProtocolParams,
                                          });
                                        }}
                                      />
                                    );
                                  }

                                  // AMRAP: editor dedicato (timer globale + lista piatta esercizi)
                                  if (ptype === 'AMRAP') {
                                    const amrapValue = normalizeAmrapParams(
                                      params as Record<string, unknown>,
                                    );
                                    return (
                                      <AmrapEditor
                                        value={amrapValue}
                                        exerciseOptions={allTemplateExerciseOptions}
                                        onChange={(next) => {
                                          updateProtocolParamMutation.mutate({
                                            id: te.id,
                                            params: next as unknown as ProtocolParams,
                                          });
                                        }}
                                      />
                                    );
                                  }

                                  // SUPERSET: editor strutturato (set-based, tabella set = fonte di verità)
                                  if (ptype === 'SUPERSET') {
                                    const supersetValue = normalizeSupersetParams(
                                      params as Record<string, unknown>,
                                    );
                                    return (
                                      <SupersetEditor
                                        value={supersetValue}
                                        exerciseOptions={allTemplateExerciseOptions}
                                        onChange={(next) => {
                                          updateProtocolParamMutation.mutate({
                                            id: te.id,
                                            params: next as unknown as ProtocolParams,
                                          });
                                        }}
                                      />
                                    );
                                  }

                                  return (
                                    <div className="rounded-md border bg-muted/20 p-3 space-y-3">
                                      <p className="text-xs font-medium text-muted-foreground">
                                        Parametri {def.label}
                                      </p>
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {def.paramFields
                                          .filter((f) => !f.showWhen || f.showWhen(params))
                                          .map((f) => {
                                          const val = getNested(params, f.key);
                                          const isWide = f.type === 'text' || f.type === 'select' || f.type === 'exercise_select' || f.type === 'number_list';
                                          return (
                                            <div key={f.key} className={cn('space-y-1', isWide && 'col-span-2 md:col-span-3')}>
                                              <Label className="text-xs">{f.label}</Label>
                                              {f.type === 'exercise_select' ? (
                                                <Select
                                                  value={(val as string) ?? ''}
                                                  onValueChange={(newVal) => {
                                                    const next = setNested(params, f.key, newVal);
                                                    updateProtocolParamMutation.mutate({ id: te.id, params: next });
                                                  }}
                                                >
                                                  <SelectTrigger className="h-8">
                                                    <SelectValue placeholder={f.placeholder || 'Seleziona esercizio…'} />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {exercises
                                                      .filter((ex) => ex.id !== te.exercise_id)
                                                      .map((ex) => (
                                                        <SelectItem key={ex.id} value={ex.id}>
                                                          {ex.name}
                                                        </SelectItem>
                                                      ))}
                                                    {exercises.filter((ex) => ex.id !== te.exercise_id).length === 0 && (
                                                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                                        Nessun esercizio disponibile.
                                                      </div>
                                                    )}
                                                  </SelectContent>
                                                </Select>
                                              ) : f.type === 'select' ? (
                                                <Select
                                                  value={(val as string) ?? ''}
                                                  onValueChange={(newVal) => {
                                                    let next = setNested(params, f.key, newVal);
                                                    // Ramping: se value_type ≠ custom, azzera la label custom
                                                    if (ptype === 'RAMPING' && f.key === 'value_type' && newVal !== 'custom') {
                                                      next = setNested(next, 'custom_value_label', null);
                                                    }
                                                    updateProtocolParamMutation.mutate({ id: te.id, params: next });
                                                  }}
                                                >
                                                  <SelectTrigger className="h-8">
                                                    <SelectValue placeholder={f.placeholder || 'Seleziona...'} />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {(f.options || []).map((opt) => (
                                                      <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                              ) : f.type === 'number_list' ? (
                                                <Input
                                                  type="text"
                                                  inputMode="numeric"
                                                  placeholder={f.placeholder || 'Es. 1,2,3'}
                                                  value={Array.isArray(val) ? (val as number[]).join(',') : ''}
                                                  onChange={(e) => {
                                                    const raw = e.target.value;
                                                    // Mantieni la digitazione ma salva solo i numeri parsabili
                                                    const parsed = raw
                                                      .split(/[,\s]+/)
                                                      .map((s) => s.trim())
                                                      .filter((s) => s !== '')
                                                      .map((s) => Number(s))
                                                      .filter((n) => Number.isFinite(n) && n > 0);
                                                    const next = setNested(params, f.key, parsed);
                                                    updateProtocolParamMutation.mutate({ id: te.id, params: next });
                                                  }}
                                                  className="h-8"
                                                />
                                              ) : (
                                                <Input
                                                  type={f.type}
                                                  min={f.min}
                                                  max={f.max}
                                                  step={f.step}
                                                  placeholder={f.placeholder}
                                                  value={val ?? ''}
                                                  onChange={(e) => {
                                                    const raw = e.target.value;
                                                    const newVal = f.type === 'text'
                                                      ? raw
                                                      : (raw === '' ? null : Number(raw));
                                                    const next = setNested(params, f.key, newVal);
                                                    updateProtocolParamMutation.mutate({ id: te.id, params: next });
                                                  }}
                                                  className="h-8"
                                                />
                                              )}
                                              {f.hint && (
                                                <p className="text-[10px] text-muted-foreground">{f.hint}</p>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                      {ptype === 'RAMPING' && (
                                        <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2 space-y-2">
                                          <p className="text-[11px] text-foreground/80 leading-relaxed">
                                            <span className="font-semibold">Nota:</span> le serie verranno generate dall'atleta durante l'allenamento aumentando il carico set dopo set, fino al KO.
                                          </p>
                                          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-medium text-foreground/80">
                                            <span className="text-muted-foreground">Unità atleta:</span>
                                            <span className="font-semibold text-foreground">{resolveRampingUnit(params)}</span>
                                          </div>
                                        </div>
                                      )}
                                      {/* EMOM, AMRAP e SUPERSET hanno editor dedicati (vedi early return sopra) */}
                                      {ptype === 'LADDER' && (
                                        <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2">
                                          <p className="text-[11px] text-foreground/80 leading-relaxed">
                                            <span className="font-semibold">Nota:</span> completa tutta la scala per formare una serie. Ripeti per il numero di serie impostato. Lo stato avanzamento (scalino X/totale, serie X/totale) verrà mostrato all'atleta durante l'allenamento.
                                          </p>
                                        </div>
                                      )}
                                      {ptype === 'DEAD_LADDER' && (
                                        <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2">
                                          <p className="text-[11px] text-foreground/80 leading-relaxed">
                                            <span className="font-semibold">Nota:</span> l'atleta aumenterà le ripetizioni progressivamente fino al cedimento. Il massimo raggiunto rappresenta il risultato della serie. Tasti "Continua" e "KO" verranno mostrati durante l'allenamento.
                                          </p>
                                        </div>
                                      )}
                                      {ptype === 'TABATA' && (
                                        <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2">
                                          <p className="text-[11px] text-foreground/80 leading-relaxed">
                                            <span className="font-semibold">Nota:</span> l'esercizio verrà eseguito a intervalli di lavoro e recupero, ripetuti automaticamente. Lo stato (LAVORO / RIPOSO), il contatore round e il nome dell'esercizio corrente verranno mostrati all'atleta durante l'allenamento.
                                          </p>
                                        </div>
                                      )}
                                      {ptype === 'HIIT' && (
                                        <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2">
                                          <p className="text-[11px] text-foreground/80 leading-relaxed">
                                            <span className="font-semibold">Nota:</span> Protocollo a intervalli flessibili con rotazione esercizi e tempi configurabili. La struttura atleta mostrerà stato LAVORO / PAUSA, intervallo corrente / totale, esercizio corrente e anteprima del prossimo esercizio.
                                          </p>
                                        </div>
                                      )}
                                      {ptype === 'RXT' && (
                                        <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2">
                                          <p className="text-[11px] text-foreground/80 leading-relaxed">
                                            <span className="font-semibold">Nota:</span> L’atleta deve completare i round previsti nel minor tempo possibile. La struttura atleta mostrerà cronometro totale count-up, round corrente / totale, azione “Round completato” e benchmark futuri su miglior tempo, ultimo tempo e trend miglioramento.
                                          </p>
                                        </div>
                                      )}
                                      {ptype === 'RUNNING_TOTAL' && (
                                        <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2">
                                          <p className="text-[11px] text-foreground/80 leading-relaxed">
                                            <span className="font-semibold">Nota:</span> L’atleta può spezzare liberamente il blocco in sub-serie fino a raggiungere il totale. La struttura atleta mostrerà cronometro count-up, reps cumulative, azione “+ aggiungi reps”, auto-complete blocco al target e tracking futuro su miglior tempo, distribuzione sub-serie e storico progressioni.
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

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

// =====================================================
// TOP SET + BACK OFF helpers
// =====================================================
type TSBOSetItem = SetItem & { weight_is_manual?: boolean };

interface TSBOParams {
  top_sets: number | null;
  top_reps: number | null;
  top_rest: number | null;
  top_increase_percent: number | null;
  top_kg: number | null;
  backoff_enabled: boolean;
  backoff_sets: number | null;
  backoff_reps: number | null;
  backoff_percentage: number | null;
  backoff_kg: number | null;
  top_set_data: TSBOSetItem[];
  backoff_data: TSBOSetItem[];
  [k: string]: any;
}

function adjustLength(
  arr: TSBOSetItem[],
  n: number,
  defaults: TSBOSetItem,
): TSBOSetItem[] {
  const safeN = Math.max(0, Math.floor(n));
  if (arr.length === safeN) return arr;
  if (arr.length > safeN) return arr.slice(0, safeN);
  const out = [...arr];
  while (out.length < safeN) out.push({ ...defaults });
  return out;
}

// Arrotondamento per eccesso al mezzo kg superiore
function ceilHalfKg(n: number): number {
  return Math.ceil(n * 2) / 2;
}

function computeTopKg(top_kg: number, increasePct: number | null, index: number): number {
  const pct = typeof increasePct === 'number' ? increasePct : 0;
  return ceilHalfKg(top_kg * (1 + (pct / 100) * index));
}

function computeBackoffKg(backoff_kg: number, reductionPct: number | null, index: number): number {
  const pct = typeof reductionPct === 'number' ? reductionPct : 0;
  return Math.max(0, ceilHalfKg(backoff_kg * (1 - (pct / 100) * index)));
}

// Riempie weight nelle celle non-manuali. Se kg base è null/0-non-valido, lascia invariato.
function applyTopAutoWeights(
  rows: TSBOSetItem[],
  top_kg: number | null,
  increasePct: number | null,
): TSBOSetItem[] {
  if (typeof top_kg !== 'number') return rows;
  return rows.map((s, i) =>
    s.weight_is_manual ? s : { ...s, weight: computeTopKg(top_kg, increasePct, i), weight_is_manual: false },
  );
}

function applyBackoffAutoWeights(
  rows: TSBOSetItem[],
  backoff_kg: number | null,
  reductionPct: number | null,
): TSBOSetItem[] {
  if (typeof backoff_kg !== 'number') return rows;
  return rows.map((s, i) =>
    s.weight_is_manual ? s : { ...s, weight: computeBackoffKg(backoff_kg, reductionPct, i), weight_is_manual: false },
  );
}

function normalizeTopSetBackoff(raw: any): TSBOParams {
  const r = raw && typeof raw === 'object' ? raw : {};
  const top_sets = typeof r.top_sets === 'number' && r.top_sets > 0 ? r.top_sets : 1;
  const top_reps = typeof r.top_reps === 'number' ? r.top_reps : null;
  const top_rest = typeof r.top_rest === 'number' ? r.top_rest : null;
  const top_kg = typeof r.top_kg === 'number' ? r.top_kg : null;
  const top_increase_percent = typeof r.top_increase_percent === 'number' ? r.top_increase_percent : null;
  const backoff_enabled = r.backoff_enabled !== false;
  const backoff_sets = typeof r.backoff_sets === 'number' && r.backoff_sets > 0 ? r.backoff_sets : (backoff_enabled ? 3 : 0);
  const backoff_reps = typeof r.backoff_reps === 'number' ? r.backoff_reps : null;
  const backoff_kg = typeof r.backoff_kg === 'number' ? r.backoff_kg : null;
  const backoff_percentage = typeof r.backoff_percentage === 'number' ? r.backoff_percentage : null;

  const topDefaults: TSBOSetItem = { reps: top_reps, weight: null, rest_seconds: top_rest, weight_is_manual: false };
  const backoffDefaults: TSBOSetItem = { reps: backoff_reps, weight: null, rest_seconds: top_rest, weight_is_manual: false };

  const top_set_data = adjustLength(
    Array.isArray(r.top_set_data) ? (r.top_set_data as TSBOSetItem[]).map((s) => ({
      reps: s?.reps ?? null,
      weight: s?.weight ?? null,
      rest_seconds: s?.rest_seconds ?? null,
      weight_is_manual: s?.weight_is_manual === true,
    })) : [],
    top_sets,
    topDefaults,
  );

  const backoff_data = adjustLength(
    Array.isArray(r.backoff_data) ? (r.backoff_data as TSBOSetItem[]).map((s) => ({
      reps: s?.reps ?? null,
      weight: s?.weight ?? null,
      rest_seconds: s?.rest_seconds ?? null,
      weight_is_manual: s?.weight_is_manual === true,
    })) : [],
    backoff_enabled ? backoff_sets : 0,
    backoffDefaults,
  );

  return {
    ...r,
    top_sets,
    top_reps,
    top_rest,
    top_increase_percent,
    top_kg,
    backoff_enabled,
    backoff_sets,
    backoff_reps,
    backoff_percentage,
    backoff_kg,
    top_set_data,
    backoff_data,
  };
}

function applyParamSync(
  prev: TSBOParams,
  key: 'top_sets' | 'top_reps' | 'top_rest' | 'top_increase_percent' | 'top_kg' | 'backoff_enabled' | 'backoff_sets' | 'backoff_reps' | 'backoff_percentage' | 'backoff_kg',
  value: number | boolean | null,
): TSBOParams {
  const next: TSBOParams = { ...prev, [key]: value as any };

  if (key === 'top_sets') {
    const n = typeof value === 'number' && value > 0 ? value : 1;
    next.top_set_data = adjustLength(prev.top_set_data, n, {
      reps: prev.top_reps,
      weight: null,
      rest_seconds: prev.top_rest,
      weight_is_manual: false,
    });
    next.top_set_data = applyTopAutoWeights(next.top_set_data, next.top_kg, next.top_increase_percent);
  } else if (key === 'top_reps') {
    next.top_set_data = prev.top_set_data.map((s) => ({ ...s, reps: typeof value === 'number' ? value : null }));
  } else if (key === 'top_rest') {
    next.top_set_data = prev.top_set_data.map((s) => ({ ...s, rest_seconds: typeof value === 'number' ? value : null }));
  } else if (key === 'top_kg' || key === 'top_increase_percent') {
    next.top_set_data = applyTopAutoWeights(prev.top_set_data, next.top_kg, next.top_increase_percent);
  } else if (key === 'backoff_sets') {
    const n = typeof value === 'number' && value > 0 ? value : 0;
    next.backoff_data = adjustLength(prev.backoff_data, n, {
      reps: prev.backoff_reps,
      weight: null,
      rest_seconds: prev.top_rest,
      weight_is_manual: false,
    });
    next.backoff_data = applyBackoffAutoWeights(next.backoff_data, next.backoff_kg, next.backoff_percentage);
  } else if (key === 'backoff_reps') {
    next.backoff_data = prev.backoff_data.map((s) => ({ ...s, reps: typeof value === 'number' ? value : null }));
  } else if (key === 'backoff_kg' || key === 'backoff_percentage') {
    next.backoff_data = applyBackoffAutoWeights(prev.backoff_data, next.backoff_kg, next.backoff_percentage);
  } else if (key === 'backoff_enabled' && value === true && (!prev.backoff_data || prev.backoff_data.length === 0)) {
    const n = prev.backoff_sets ?? 3;
    next.backoff_sets = n;
    next.backoff_data = adjustLength([], n, {
      reps: prev.backoff_reps,
      weight: null,
      rest_seconds: prev.top_rest,
      weight_is_manual: false,
    });
    next.backoff_data = applyBackoffAutoWeights(next.backoff_data, next.backoff_kg, next.backoff_percentage);
  }

  return next;
}

interface TopSetBackoffTableProps {
  title: string;
  sets: SetItem[];
  onCellChange: (idx: number, patch: Partial<SetItem> & { weight_is_manual?: boolean }) => void;
  onAddSet?: () => void;
  onRemoveSet?: (idx: number) => void;
}

function TopSetBackoffTable({ title, sets, onCellChange, onAddSet, onRemoveSet }: TopSetBackoffTableProps) {
  const parseNum = (v: string): number | null => {
    if (v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  if (sets.length === 0) {
    return (
      <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
        {title}: imposta il numero di serie per generare la tabella.
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
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
              {onAddSet && (
                <th className="px-1 py-1 text-center align-middle">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    onClick={onAddSet}
                    aria-label="Aggiungi set"
                  >
                    <Plus className="h-3 w-3 mr-0.5" /> Set
                  </Button>
                </th>
              )}
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
                    onChange={(e) => onCellChange(i, { reps: parseNum(e.target.value) })}
                    className="h-8 text-center px-1"
                  />
                </td>
              ))}
              {onAddSet && <td />}
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
                    onChange={(e) => {
                      const w = parseNum(e.target.value);
                      onCellChange(i, { weight: w, weight_is_manual: w !== null });
                    }}
                    className="h-8 text-center px-1"
                  />
                </td>
              ))}
              {onAddSet && <td />}
            </tr>
            <tr>
              <td className="pr-2 py-1 text-muted-foreground sticky left-0 bg-muted/20">Rec (s)</td>
              {sets.map((s, i) => (
                <td key={i} className="px-1 py-1">
                  <Input
                    type="number"
                    min="0"
                    value={s.rest_seconds ?? ''}
                    onChange={(e) => onCellChange(i, { rest_seconds: parseNum(e.target.value) })}
                    className="h-8 text-center px-1"
                  />
                </td>
              ))}
              {onAddSet && <td />}
            </tr>
            {onRemoveSet && (
              <tr>
                <td className="pr-2 py-1 sticky left-0 bg-muted/20"></td>
                {sets.map((_, i) => (
                  <td key={i} className="px-1 py-1 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      disabled={sets.length <= 1}
                      onClick={() => onRemoveSet(i)}
                      aria-label={`Elimina Set ${i + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                ))}
                {onAddSet && <td />}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
