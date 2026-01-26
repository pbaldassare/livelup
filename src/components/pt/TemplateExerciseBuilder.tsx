import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Search,
  Dumbbell,
  Clock,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  exercise?: Exercise;
}

interface TemplateExerciseBuilderProps {
  templateId: string;
  onSave?: () => void;
}

export function TemplateExerciseBuilder({ templateId, onSave }: TemplateExerciseBuilderProps) {
  const queryClient = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

  // Fetch template exercises
  const { data: templateExercises = [], isLoading } = useQuery({
    queryKey: ['template-exercises', templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('template_exercises')
        .select(`
          *,
          exercises (*)
        `)
        .eq('template_id', templateId)
        .order('order_index');
      
      if (error) throw error;
      return data.map(te => ({
        ...te,
        exercise: te.exercises
      })) as TemplateExercise[];
    },
    enabled: !!templateId,
  });

  // Add exercise mutation
  const addExerciseMutation = useMutation({
    mutationFn: async (exercise: Exercise) => {
      const maxOrder = templateExercises.length > 0 
        ? Math.max(...templateExercises.map(te => te.order_index)) + 1 
        : 0;

      const { error } = await supabase
        .from('template_exercises')
        .insert({
          template_id: templateId,
          exercise_id: exercise.id,
          order_index: maxOrder,
          sets: 3,
          reps_min: 10,
          reps_max: 12,
          rest_seconds: 60,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-exercises', templateId] });
      toast.success('Esercizio aggiunto');
      setSearchOpen(false);
    },
    onError: () => {
      toast.error('Errore durante l\'aggiunta');
    },
  });

  // Update exercise mutation
  const updateExerciseMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; sets?: number; reps_min?: number; reps_max?: number; rest_seconds?: number; notes?: string }) => {
      const { error } = await supabase
        .from('template_exercises')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-exercises', templateId] });
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
      queryClient.invalidateQueries({ queryKey: ['template-exercises', templateId] });
      toast.success('Esercizio rimosso');
    },
    onError: () => {
      toast.error('Errore durante la rimozione');
    },
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: 'up' | 'down' }) => {
      const currentIndex = templateExercises.findIndex(te => te.id === id);
      if (currentIndex === -1) return;

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= templateExercises.length) return;

      const current = templateExercises[currentIndex];
      const target = templateExercises[targetIndex];

      // Swap order indices
      await supabase.from('template_exercises').update({ order_index: target.order_index }).eq('id', current.id);
      await supabase.from('template_exercises').update({ order_index: current.order_index }).eq('id', target.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-exercises', templateId] });
    },
  });

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
            {templateExercises.length} esercizi configurati
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

      {/* Exercise List */}
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
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {templateExercises.map((te, index) => (
              <Card key={te.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Order Controls */}
                    <div className="flex flex-col items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => reorderMutation.mutate({ id: te.id, direction: 'up' })}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium text-muted-foreground">
                        {index + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => reorderMutation.mutate({ id: te.id, direction: 'down' })}
                        disabled={index === templateExercises.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
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
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

export default TemplateExerciseBuilder;
