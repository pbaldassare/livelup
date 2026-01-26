import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { createWorkout } from '@/lib/api/workouts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarIcon, Dumbbell, Users, FileText } from 'lucide-react';
import { toast } from 'sonner';

// =====================================================
// ASSIGN WORKOUT DIALOG
// Assegna un template o scheda custom a un atleta
// =====================================================

interface ConnectedAthlete {
  id: string;
  atleta_user_id: string;
  profile: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
}

interface WorkoutTemplate {
  id: string;
  title: string;
  difficulty_level: string;
  estimated_duration: number | null;
  exerciseCount: number;
}

interface AssignWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedAthleteId?: string;
  preselectedTemplateId?: string;
}

export function AssignWorkoutDialog({ 
  open, 
  onOpenChange, 
  preselectedAthleteId,
  preselectedTemplateId 
}: AssignWorkoutDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Form state
  const [selectedAthleteId, setSelectedAthleteId] = useState(preselectedAthleteId || '');
  const [workoutSource, setWorkoutSource] = useState<'template' | 'custom'>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState(preselectedTemplateId || '');
  const [customTitle, setCustomTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [dueDate, setDueDate] = useState<Date>();
  const [notes, setNotes] = useState('');

  // Fetch connected athletes
  const { data: athletes = [] } = useQuery({
    queryKey: ['connected-athletes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('pt_atleta_connections')
        .select('id, atleta_user_id')
        .eq('pt_user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;

      // Enrich with profile data
      const enriched = await Promise.all(
        (data || []).map(async (conn) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('user_id', conn.atleta_user_id)
            .single();
          
          return {
            ...conn,
            profile: profile || { first_name: null, last_name: null, avatar_url: null }
          };
        })
      );

      return enriched as ConnectedAthlete[];
    },
    enabled: !!user?.id && open,
  });

  // Fetch templates with exercise count
  const { data: templates = [] } = useQuery({
    queryKey: ['pt-templates-with-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('workout_templates')
        .select(`
          id,
          title,
          difficulty_level,
          estimated_duration,
          template_exercises (id)
        `)
        .eq('pt_user_id', user.id)
        .order('title');

      if (error) throw error;

      return (data || []).map(t => ({
        id: t.id,
        title: t.title,
        difficulty_level: t.difficulty_level,
        estimated_duration: t.estimated_duration,
        exerciseCount: t.template_exercises?.length || 0
      })) as WorkoutTemplate[];
    },
    enabled: !!user?.id && open,
  });

  // Assign workout mutation
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Non autenticato');
      if (!selectedAthleteId) throw new Error('Seleziona un atleta');
      
      const athleteConn = athletes.find(a => a.atleta_user_id === selectedAthleteId);
      if (!athleteConn) throw new Error('Atleta non trovato');

      if (workoutSource === 'template') {
        if (!selectedTemplateId) throw new Error('Seleziona un template');
        
        const template = templates.find(t => t.id === selectedTemplateId);
        if (!template) throw new Error('Template non trovato');

        // Fetch template exercises
        const { data: templateExercises, error } = await supabase
          .from('template_exercises')
          .select('*')
          .eq('template_id', selectedTemplateId)
          .order('order_index');

        if (error) throw error;

        // Create workout with exercises from template
        await createWorkout({
          atletaUserId: selectedAthleteId,
          ptUserId: user.id,
          title: template.title,
          templateId: selectedTemplateId,
          scheduledDate: scheduledDate?.toISOString(),
          dueDate: dueDate?.toISOString(),
          exercises: (templateExercises || []).map(te => ({
            exerciseId: te.exercise_id,
            orderIndex: te.order_index,
            prescribedSets: te.sets,
            prescribedRepsMin: te.reps_min,
            prescribedRepsMax: te.reps_max,
            restSeconds: te.rest_seconds,
            notes: te.notes,
          })),
        });
      } else {
        if (!customTitle) throw new Error('Inserisci un titolo');
        
        // Create empty workout (exercises can be added later)
        await createWorkout({
          atletaUserId: selectedAthleteId,
          ptUserId: user.id,
          title: customTitle,
          description: notes,
          scheduledDate: scheduledDate?.toISOString(),
          dueDate: dueDate?.toISOString(),
          exercises: [],
        });
      }

      // Send notification to athlete
      const athleteName = `${athleteConn.profile.first_name || ''} ${athleteConn.profile.last_name || ''}`.trim();
      await supabase.from('notifications').insert({
        user_id: selectedAthleteId,
        type: 'workout_assigned',
        title: 'Nuovo allenamento!',
        body: 'Il tuo PT ti ha assegnato un nuovo allenamento',
        action_url: '/app/workout',
        data: { pt_user_id: user.id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-workouts'] });
      toast.success('Allenamento assegnato con successo!');
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Errore durante l\'assegnazione');
    },
  });

  const resetForm = () => {
    setSelectedAthleteId(preselectedAthleteId || '');
    setWorkoutSource('template');
    setSelectedTemplateId(preselectedTemplateId || '');
    setCustomTitle('');
    setScheduledDate(undefined);
    setDueDate(undefined);
    setNotes('');
  };

  const selectedAthlete = athletes.find(a => a.atleta_user_id === selectedAthleteId);
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Assegna Allenamento
          </DialogTitle>
          <DialogDescription>
            Assegna un template o crea una scheda personalizzata
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Athlete Selection */}
          <div className="space-y-2">
            <Label>Atleta *</Label>
            <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona atleta..." />
              </SelectTrigger>
              <SelectContent>
                {athletes.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nessun atleta collegato</p>
                  </div>
                ) : (
                  athletes.map((athlete) => (
                    <SelectItem key={athlete.atleta_user_id} value={athlete.atleta_user_id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={athlete.profile.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {athlete.profile.first_name?.[0]}{athlete.profile.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span>
                          {athlete.profile.first_name} {athlete.profile.last_name}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Workout Source */}
          <div className="space-y-3">
            <Label>Tipo Scheda</Label>
            <RadioGroup 
              value={workoutSource} 
              onValueChange={(v) => setWorkoutSource(v as 'template' | 'custom')}
              className="grid grid-cols-2 gap-4"
            >
              <Label
                htmlFor="template"
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                  workoutSource === 'template' 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="template" id="template" />
                <div>
                  <p className="font-medium">Template</p>
                  <p className="text-xs text-muted-foreground">Usa template esistente</p>
                </div>
              </Label>
              <Label
                htmlFor="custom"
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                  workoutSource === 'custom' 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="custom" id="custom" />
                <div>
                  <p className="font-medium">Personalizzata</p>
                  <p className="text-xs text-muted-foreground">Crea nuova scheda</p>
                </div>
              </Label>
            </RadioGroup>
          </div>

          {/* Template Selection */}
          {workoutSource === 'template' && (
            <div className="space-y-2">
              <Label>Template *</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nessun template creato</p>
                    </div>
                  ) : (
                    templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <span>{template.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {template.exerciseCount} es.
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedTemplate && selectedTemplate.exerciseCount === 0 && (
                <p className="text-xs text-warning">
                  ⚠️ Questo template non ha esercizi configurati
                </p>
              )}
            </div>
          )}

          {/* Custom Title */}
          {workoutSource === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="title">Titolo Scheda *</Label>
              <Input
                id="title"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Es: Scheda Forza - Settimana 1"
              />
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Programmata</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !scheduledDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, 'PPP', { locale: it }) : 'Seleziona'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    locale={it}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Scadenza</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'PPP', { locale: it }) : 'Seleziona'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    locale={it}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Note per l'atleta</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Istruzioni o raccomandazioni..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button 
            onClick={() => assignMutation.mutate()}
            disabled={
              assignMutation.isPending ||
              !selectedAthleteId ||
              (workoutSource === 'template' && !selectedTemplateId) ||
              (workoutSource === 'custom' && !customTitle)
            }
          >
            {assignMutation.isPending ? 'Assegnando...' : 'Assegna'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AssignWorkoutDialog;
