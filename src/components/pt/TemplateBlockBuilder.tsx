import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  AlertTriangle,
  Layers,
  Repeat,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { TemplateExerciseBuilder } from '@/components/pt/TemplateExerciseBuilder';

// =====================================================
// TEMPLATE STRUCTURE BUILDER (ex BlockBuilder)
// La scheda è composta da:
//  1) Esercizi singoli (fuori circuito) → block_id = null
//  2) Circuiti opzionali → semplici contenitori (block_id = uuid)
// Il protocollo NON vive sul circuito ma sull'esercizio.
// =====================================================

interface TemplateCircuit {
  id: string;
  template_id: string;
  order_index: number;
  name: string | null;
}

interface TemplateBlockBuilderProps {
  templateId: string;
}

export function TemplateBlockBuilder({ templateId }: TemplateBlockBuilderProps) {
  const queryClient = useQueryClient();

  const circuitsQueryKey = ['template-blocks', templateId];

  const { data: circuits = [], isLoading } = useQuery({
    queryKey: circuitsQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('template_blocks')
        .select('id, template_id, order_index, name')
        .eq('template_id', templateId)
        .order('order_index');
      if (error) throw error;
      return (data || []) as TemplateCircuit[];
    },
    enabled: !!templateId,
  });

  // Conteggio esercizi per circuito + standalone
  const { data: exerciseCounts = { byCircuit: {} as Record<string, number>, standalone: 0 } } =
    useQuery({
      queryKey: ['template-blocks-counts', templateId, circuits.map((c) => c.id).join(',')],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('template_exercises')
          .select('block_id')
          .eq('template_id', templateId);
        if (error) throw error;
        const byCircuit: Record<string, number> = {};
        let standalone = 0;
        for (const row of data || []) {
          const k = (row as any).block_id as string | null;
          if (k) byCircuit[k] = (byCircuit[k] || 0) + 1;
          else standalone++;
        }
        return { byCircuit, standalone };
      },
      enabled: !!templateId,
    });

  const addCircuitMutation = useMutation({
    mutationFn: async () => {
      const maxOrder =
        circuits.length > 0 ? Math.max(...circuits.map((c) => c.order_index)) + 1 : 0;
      const letter = String.fromCharCode(65 + circuits.length); // A, B, C...
      const { error } = await supabase.from('template_blocks').insert({
        template_id: templateId,
        order_index: maxOrder,
        type: 'SET' as any, // legacy column, ignorata dalla UI
        name: `Circuito ${letter}`,
        params: {} as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: circuitsQueryKey });
      toast.success('Circuito aggiunto');
    },
    onError: (e: any) => toast.error(e.message || 'Errore aggiunta circuito'),
  });

  const updateCircuitMutation = useMutation({
    mutationFn: async (payload: { id: string; patch: Partial<TemplateCircuit> }) => {
      const { error } = await supabase
        .from('template_blocks')
        .update(payload.patch as any)
        .eq('id', payload.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: circuitsQueryKey }),
  });

  // Eliminare un circuito NON elimina più gli esercizi:
  // li scolla (block_id = null) così tornano in "Esercizi singoli".
  const deleteCircuitMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: detachErr } = await supabase
        .from('template_exercises')
        .update({ block_id: null })
        .eq('template_id', templateId)
        .eq('block_id', id);
      if (detachErr) throw detachErr;
      const { error } = await supabase.from('template_blocks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: circuitsQueryKey });
      queryClient.invalidateQueries({ queryKey: ['template-exercises', templateId] });
      queryClient.invalidateQueries({ queryKey: ['template-blocks-counts', templateId] });
      toast.success('Circuito eliminato — esercizi spostati fuori circuito');
    },
    onError: (e: any) => toast.error(e.message || 'Errore eliminazione'),
  });

  const reorderMutation = useMutation({
    mutationFn: async (rows: { id: string; order_index: number }[]) => {
      await Promise.all(
        rows.map((r) =>
          supabase.from('template_blocks').update({ order_index: r.order_index }).eq('id', r.id),
        ),
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: circuitsQueryKey }),
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const from = result.source.index;
    const to = result.destination.index;
    if (from === to) return;

    const reordered = Array.from(circuits);
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    const updates = reordered.map((c, i) => ({ id: c.id, order_index: i }));
    queryClient.setQueryData(circuitsQueryKey, reordered.map((c, i) => ({ ...c, order_index: i })));
    reorderMutation.mutate(updates);
  };

  const totalExercises = exerciseCounts.standalone + Object.values(exerciseCounts.byCircuit).reduce((a, b) => a + b, 0);
  const isSchedaEmpty = totalExercises === 0 && circuits.length === 0;

  return (
    <div className="space-y-6">
      {/* Header con azioni */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="font-medium">Struttura della scheda</h4>
          <p className="text-sm text-muted-foreground">
            {totalExercises} esercizi totali · {circuits.length} circuiti
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => addCircuitMutation.mutate()} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Aggiungi circuito
          </Button>
        </div>
      </div>

      {/* Empty state globale: scheda completamente vuota */}
      {isSchedaEmpty && (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center space-y-3">
            <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <div>
              <p className="font-medium">Scheda vuota</p>
              <p className="text-sm text-muted-foreground mt-1">
                Inizia aggiungendo un esercizio o creando un circuito.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sezione: Esercizi singoli (fuori circuito) */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <h5 className="font-medium">Esercizi della scheda</h5>
            <Badge variant="outline" className="text-xs">
              fuori circuito
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            Esercizi non raggruppati in un circuito. Ognuno ha il proprio protocollo.
          </p>
          <div className="rounded-md border bg-muted/20 p-3">
            <TemplateExerciseBuilder templateId={templateId} blockId={null} />
          </div>
        </CardContent>
      </Card>

      {/* Empty state circuiti */}
      {!isLoading && circuits.length === 0 && !isSchedaEmpty && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Repeat className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground font-medium">
              Nessun circuito configurato
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              I circuiti raggruppano esercizi da eseguire a giro continuo (es. "Finisher").
            </p>
          </CardContent>
        </Card>
      )}

      {/* Lista circuiti */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="template-circuits">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-4">
              {circuits.map((circuit, index) => {
                const exCount = exerciseCounts.byCircuit[circuit.id] || 0;
                const isEmpty = exCount === 0;
                return (
                  <Draggable key={circuit.id} draggableId={circuit.id} index={index}>
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
                          {/* Header circuito */}
                          <div className="flex items-center gap-2">
                            <div
                              {...prov.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing text-muted-foreground"
                              aria-label="Trascina per riordinare"
                            >
                              <GripVertical className="h-5 w-5" />
                            </div>
                            <Repeat className="h-4 w-4 text-primary shrink-0" />
                            <Input
                              value={circuit.name ?? ''}
                              placeholder={`Circuito ${String.fromCharCode(65 + index)}`}
                              onChange={(e) =>
                                updateCircuitMutation.mutate({
                                  id: circuit.id,
                                  patch: { name: e.target.value || null },
                                })
                              }
                              className="h-8 max-w-xs"
                            />
                            <Badge variant="outline" className="text-xs shrink-0">
                              Circuito
                            </Badge>
                            <div className="flex items-center gap-1 ml-auto">
                              {isEmpty && (
                                <Badge
                                  variant="outline"
                                  className="text-xs gap-1 border-warning/40 text-warning"
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                  Vuoto
                                </Badge>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    title="Elimina circuito"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Eliminare il circuito?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Gli esercizi al suo interno NON verranno cancellati: torneranno
                                      in "Esercizi singoli". Puoi rimetterli in un nuovo circuito in
                                      qualsiasi momento.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteCircuitMutation.mutate(circuit.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Elimina
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>

                          {/* Esercizi nel circuito */}
                          <div className="rounded-md border bg-muted/30 p-3">
                            <TemplateExerciseBuilder
                              templateId={templateId}
                              blockId={circuit.id}
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
