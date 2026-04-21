import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Trash2,
  GripVertical,
  Copy,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  PROTOCOL_LIST,
  PROTOCOL_REGISTRY,
  getProtocolDef,
  getNested,
  setNested,
  type ProtocolType,
  type ProtocolParams,
} from '@/lib/protocols/registry';
import { ProtocolInfoPopover } from '@/components/protocols/ProtocolInfoPopover';
import { TemplateExerciseBuilder } from '@/components/pt/TemplateExerciseBuilder';

// =====================================================
// TEMPLATE BLOCK BUILDER
// Costruisce una scheda come sequenza di blocchi (protocolli),
// ognuno contenente esercizi.
// =====================================================

interface TemplateBlock {
  id: string;
  template_id: string;
  order_index: number;
  type: ProtocolType;
  name: string | null;
  params: ProtocolParams;
  info_note: string | null;
}

interface TemplateBlockBuilderProps {
  templateId: string;
}

export function TemplateBlockBuilder({ templateId }: TemplateBlockBuilderProps) {
  const queryClient = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);

  const blocksQueryKey = ['template-blocks', templateId];

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: blocksQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('template_blocks')
        .select('id, template_id, order_index, type, name, params, info_note')
        .eq('template_id', templateId)
        .order('order_index');
      if (error) throw error;
      return (data || []) as TemplateBlock[];
    },
    enabled: !!templateId,
  });

  // Conteggio esercizi per blocco (per warning)
  const { data: exerciseCounts = {} } = useQuery({
    queryKey: ['template-blocks-counts', templateId, blocks.map((b) => b.id).join(',')],
    queryFn: async () => {
      if (blocks.length === 0) return {};
      const { data, error } = await supabase
        .from('template_exercises')
        .select('block_id')
        .eq('template_id', templateId)
        .not('block_id', 'is', null);
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const row of data || []) {
        const k = (row as any).block_id as string;
        map[k] = (map[k] || 0) + 1;
      }
      return map;
    },
    enabled: !!templateId && blocks.length > 0,
  });

  const addBlockMutation = useMutation({
    mutationFn: async (type: ProtocolType) => {
      const def = getProtocolDef(type);
      const maxOrder = blocks.length > 0 ? Math.max(...blocks.map((b) => b.order_index)) + 1 : 0;
      const { error } = await supabase.from('template_blocks').insert({
        template_id: templateId,
        order_index: maxOrder,
        type,
        name: def.label,
        params: def.defaultParams as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blocksQueryKey });
      toast.success('Blocco aggiunto');
      setPickerOpen(false);
    },
    onError: (e: any) => toast.error(e.message || 'Errore aggiunta blocco'),
  });

  const updateBlockMutation = useMutation({
    mutationFn: async (payload: { id: string; patch: Partial<TemplateBlock> }) => {
      const { error } = await supabase
        .from('template_blocks')
        .update(payload.patch as any)
        .eq('id', payload.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: blocksQueryKey }),
  });

  const deleteBlockMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('template_blocks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blocksQueryKey });
      queryClient.invalidateQueries({ queryKey: ['template-exercises', templateId] });
      toast.success('Blocco eliminato');
    },
    onError: (e: any) => toast.error(e.message || 'Errore eliminazione'),
  });

  const duplicateBlockMutation = useMutation({
    mutationFn: async (block: TemplateBlock) => {
      const maxOrder = blocks.length > 0 ? Math.max(...blocks.map((b) => b.order_index)) + 1 : 0;
      const { data: newBlock, error } = await supabase
        .from('template_blocks')
        .insert({
          template_id: templateId,
          order_index: maxOrder,
          type: block.type,
          name: block.name ? `${block.name} (Copia)` : null,
          params: block.params as any,
          info_note: block.info_note,
        })
        .select()
        .single();
      if (error) throw error;

      // Clona esercizi
      const { data: srcEx, error: exErr } = await supabase
        .from('template_exercises')
        .select('exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes, tempo')
        .eq('template_id', templateId)
        .eq('block_id', block.id)
        .order('order_index');
      if (exErr) throw exErr;

      if (srcEx && srcEx.length > 0) {
        const inserts = srcEx.map((e) => ({
          template_id: templateId,
          block_id: newBlock.id,
          exercise_id: e.exercise_id,
          order_index: e.order_index,
          sets: e.sets,
          reps_min: e.reps_min,
          reps_max: e.reps_max,
          rest_seconds: e.rest_seconds,
          notes: e.notes,
          tempo: e.tempo,
        }));
        const { error: insErr } = await supabase.from('template_exercises').insert(inserts);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blocksQueryKey });
      queryClient.invalidateQueries({ queryKey: ['template-exercises', templateId] });
      toast.success('Blocco duplicato');
    },
    onError: (e: any) => toast.error(e.message || 'Errore duplicazione'),
  });

  const reorderMutation = useMutation({
    mutationFn: async (rows: { id: string; order_index: number }[]) => {
      await Promise.all(
        rows.map((r) =>
          supabase.from('template_blocks').update({ order_index: r.order_index }).eq('id', r.id),
        ),
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: blocksQueryKey }),
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const from = result.source.index;
    const to = result.destination.index;
    if (from === to) return;

    const reordered = Array.from(blocks);
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    const updates = reordered.map((b, i) => ({ id: b.id, order_index: i }));
    queryClient.setQueryData(blocksQueryKey, reordered.map((b, i) => ({ ...b, order_index: i })));
    reorderMutation.mutate(updates);
  };

  const updateParam = (block: TemplateBlock, path: string, raw: string) => {
    const num = raw === '' ? null : Number(raw);
    let next = setNested(block.params || {}, path, num);
    // Mutua esclusione SET: reps ↔ duration_seconds
    if (block.type === 'SET') {
      if (path === 'reps' && num != null) next = setNested(next, 'duration_seconds', null);
      if (path === 'duration_seconds' && num != null) next = setNested(next, 'reps', null);
    }
    updateBlockMutation.mutate({ id: block.id, patch: { params: next as any } });
  };

  // Disabilita campi mutualmente esclusivi nel form (solo SET)
  const isFieldDisabled = (block: TemplateBlock, key: string): boolean => {
    if (block.type !== 'SET') return false;
    const reps = getNested(block.params, 'reps');
    const dur = getNested(block.params, 'duration_seconds');
    if (key === 'reps' && dur != null && dur !== '') return true;
    if (key === 'duration_seconds' && reps != null && reps !== '') return true;
    return false;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">Blocchi della scheda</h4>
          <p className="text-sm text-muted-foreground">
            {blocks.length} blocchi · trascina per riordinare
          </p>
        </div>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi blocco
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-2" align="end">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground px-2 pb-1">
                Scegli il tipo di protocollo
              </p>
              {PROTOCOL_LIST.map((def) => {
                const Icon = def.icon;
                return (
                  <button
                    key={def.type}
                    type="button"
                    onClick={() => addBlockMutation.mutate(def.type)}
                    className="w-full text-left px-2 py-2 rounded-md hover:bg-accent flex items-start gap-2"
                  >
                    <Icon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{def.label}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {def.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Empty state */}
      {!isLoading && blocks.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground font-medium">
              Nessun blocco nella scheda
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Aggiungi un blocco SET per iniziare: serie, reps, kg e recupero.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Blocks list */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="template-blocks">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-4">
              {blocks.map((block, index) => {
                const def = getProtocolDef(block.type);
                const Icon = def.icon;
                const exCount = exerciseCounts[block.id] || 0;
                const isEmpty = exCount === 0;
                return (
                  <Draggable key={block.id} draggableId={block.id} index={index}>
                    {(prov, snap) => (
                      <Card
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        className={cn(
                          'overflow-hidden transition-shadow',
                          snap.isDragging && 'shadow-lg ring-2 ring-primary',
                        )}
                      >
                        <CardContent className="p-4 space-y-4">
                          {/* Header blocco */}
                          <div className="flex items-center gap-2">
                            <div
                              {...prov.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing text-muted-foreground"
                              aria-label="Trascina per riordinare"
                            >
                              <GripVertical className="h-5 w-5" />
                            </div>
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Icon className="h-4 w-4 text-primary shrink-0" />
                              <Input
                                value={block.name ?? ''}
                                placeholder={def.label}
                                onChange={(e) =>
                                  updateBlockMutation.mutate({
                                    id: block.id,
                                    patch: { name: e.target.value || null },
                                  })
                                }
                                className="h-8 max-w-xs"
                              />
                              <Badge variant="outline" className="text-xs shrink-0">
                                {def.label}
                              </Badge>
                              <ProtocolInfoPopover type={block.type} />
                            </div>
                            <div className="flex items-center gap-1">
                              {isEmpty && (
                                <Badge
                                  variant="outline"
                                  className="text-xs gap-1 border-warning/40 text-warning"
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                  Vuoto
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => duplicateBlockMutation.mutate(block)}
                                title="Duplica blocco"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    title="Elimina blocco"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Eliminare il blocco?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Verranno rimossi anche tutti gli esercizi al suo interno.
                                      L'azione non è reversibile.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteBlockMutation.mutate(block.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Elimina
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>

                          {/* Parametri dinamici */}
                          {def.paramFields.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                              {def.paramFields.map((f) => {
                                const val = getNested(block.params || {}, f.key);
                                const disabled = isFieldDisabled(block, f.key);
                                return (
                                  <div key={f.key} className="space-y-1">
                                    <Label className={cn('text-xs', disabled && 'opacity-50')}>{f.label}</Label>
                                    <Input
                                      type={f.type}
                                      min={f.min}
                                      max={f.max}
                                      step={f.step}
                                      placeholder={f.placeholder}
                                      value={val ?? ''}
                                      disabled={disabled}
                                      onChange={(e) => updateParam(block, f.key, e.target.value)}
                                      className="h-8"
                                    />
                                    {f.hint && (
                                      <p className="text-[10px] text-muted-foreground">{f.hint}</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Esercizi nel blocco */}
                          <div className="rounded-md border bg-muted/30 p-3">
                            <TemplateExerciseBuilder
                              templateId={templateId}
                              blockId={block.id}
                              blockType={block.type}
                              blockParams={block.params as any}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

export default TemplateBlockBuilder;
