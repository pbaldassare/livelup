import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { AssignWorkoutDialog } from '@/components/pt/AssignWorkoutDialog';
import { TemplateExerciseBuilder } from '@/components/pt/TemplateExerciseBuilder';
import { CreateExerciseDialog } from '@/components/pt/CreateExerciseDialog';
import { useFavoriteExercises, useToggleFavorite } from '@/hooks/usePTFavoriteExercises';
import { ExerciseDetailDialog } from '@/components/exercises/ExerciseDetailDialog';
import { Star, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MultiSelectSearch } from '@/components/common/MultiSelectSearch';

import { InlineEditText, InlineEditSelect } from '@/components/dashboard/InlineEditCells';
import { 
  Dumbbell, 
  Plus, 
  Search, 
  Copy, 
  Trash2,
  FileText,
  Users,
  Eye,
  UserPlus,
  BookOpen,
  CalendarDays,
  Pencil,
  Video,
} from 'lucide-react';
import { ProgramsTab } from '@/components/pt/ProgramsTab';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

// =====================================================
// PT WORKOUTS PAGE - Gestione Allenamenti
// Solo per ruolo: pt (web dashboard)
// =====================================================

const MUSCLE_GROUP_OPTIONS = [
  { id: 'petto', name: 'Petto' },
  { id: 'schiena', name: 'Schiena' },
  { id: 'gambe', name: 'Gambe' },
  { id: 'spalle', name: 'Spalle' },
  { id: 'braccia', name: 'Braccia' },
  { id: 'core', name: 'Core' },
  { id: 'glutei', name: 'Glutei' },
  { id: 'addominali', name: 'Addominali' },
  { id: 'cardio', name: 'Cardio' },
  { id: 'full body', name: 'Full Body' },
];

interface WorkoutTemplate {
  id: string;
  title: string;
  description: string | null;
  difficulty_level: string;
  category: string | null;
  estimated_duration: number | null;
  is_public: boolean;
  created_at: string;
  tags: string[] | null;
}

interface Workout {
  id: string;
  title: string;
  description: string | null;
  status: string;
  scheduled_date: string | null;
  due_date: string | null;
  atleta_user_id: string;
  created_at: string;
}

export function PTWorkoutsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('templates');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isCreateExerciseOpen, setIsCreateExerciseOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<any | null>(null);
  const [deleteExerciseId, setDeleteExerciseId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editExercisesDialogOpen, setEditExercisesDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState<{
    title: string;
    description: string;
    difficulty_level: string;
    category: string;
    estimated_duration: number;
    muscle_groups: string[];
  }>({
    title: '',
    description: '',
    difficulty_level: 'intermedio',
    category: '',
    estimated_duration: 60,
    muscle_groups: [],
  });

  // Fetch templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['pt-templates', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('pt_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WorkoutTemplate[];
    },
    enabled: !!user?.id,
  });

  // Fetch only PT's favorite exercises
  const { data: exercises = [], isLoading: exercisesLoading } = useFavoriteExercises();
  const toggleFav = useToggleFavorite();
  const [previewExercise, setPreviewExercise] = useState<any | null>(null);

  const { data: workouts = [], isLoading: workoutsLoading } = useQuery({
    queryKey: ['pt-workouts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('pt_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Workout[];
    },
    enabled: !!user?.id,
  });

  // Create template mutation - crea scheda + blocco SET di default + redirect al builder
  const createTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!newTemplate.title.trim()) throw new Error('Inserisci un titolo');
      if (newTemplate.muscle_groups.length === 0) throw new Error('Seleziona almeno un gruppo muscolare');

      // 1. Crea la scheda
      const { data: created, error } = await supabase
        .from('workout_templates')
        .insert({
          pt_user_id: user.id,
          title: newTemplate.title.trim(),
          description: newTemplate.description || null,
          difficulty_level: newTemplate.difficulty_level as 'principiante' | 'intermedio' | 'avanzato',
          category: newTemplate.category || null,
          estimated_duration: newTemplate.estimated_duration,
          muscle_groups: newTemplate.muscle_groups,
          is_public: false,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // 2. Crea automaticamente il primo blocco SET (default)
      const { error: blockError } = await supabase
        .from('template_blocks')
        .insert({
          template_id: created.id,
          order_index: 0,
          type: 'SET',
          name: 'Blocco 1',
          params: { sets: 4, reps: 10, rest_seconds: 90 } as any,
        });

      if (blockError) {
        console.warn('Errore creazione blocco default:', blockError);
      }

      return created;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['pt-templates'] });
      toast.success('Scheda creata · Inizia ad aggiungere esercizi');
      setIsCreateDialogOpen(false);
      setNewTemplate({
        title: '',
        description: '',
        difficulty_level: 'intermedio',
        category: '',
        estimated_duration: 60,
        muscle_groups: [],
      });
      navigate(`/pt/templates/${created.id}`);
    },
    onError: (e: any) => {
      toast.error(e?.message || 'Errore durante la creazione della scheda');
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('workout_templates')
        .delete()
        .eq('id', templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-templates'] });
      toast.success('Scheda eliminata');
    },
    onError: () => {
      toast.error('Errore durante l\'eliminazione');
    },
  });

  // Duplicate template mutation
  const duplicateTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // 1. Fetch the original template
      const { data: originalTemplate, error: templateError } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      
      if (templateError) throw templateError;

      // 2. Create a copy of the template
      const { data: newTemplate, error: insertError } = await supabase
        .from('workout_templates')
        .insert({
          pt_user_id: user.id,
          title: `${originalTemplate.title} (Copia)`,
          description: originalTemplate.description,
          difficulty_level: originalTemplate.difficulty_level,
          category: originalTemplate.category,
          estimated_duration: originalTemplate.estimated_duration,
          is_public: false,
          tags: originalTemplate.tags,
        })
        .select()
        .single();
      
      if (insertError) throw insertError;

      // 3. Fetch exercises from the original template
      const { data: originalExercises, error: exercisesError } = await supabase
        .from('template_exercises')
        .select('*')
        .eq('template_id', templateId)
        .order('order_index');
      
      if (exercisesError) throw exercisesError;

      // 4. Copy exercises to the new template
      if (originalExercises && originalExercises.length > 0) {
        const newExercises = originalExercises.map((exercise) => ({
          template_id: newTemplate.id,
          exercise_id: exercise.exercise_id,
          order_index: exercise.order_index,
          sets: exercise.sets,
          reps_min: exercise.reps_min,
          reps_max: exercise.reps_max,
          rest_seconds: exercise.rest_seconds,
          tempo: exercise.tempo,
          notes: exercise.notes,
        }));

        const { error: copyError } = await supabase
          .from('template_exercises')
          .insert(newExercises);
        
        if (copyError) throw copyError;
      }

      return newTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-templates'] });
      toast.success('Scheda duplicata con successo');
    },
    onError: () => {
      toast.error('Errore durante la duplicazione della scheda');
    },
  });

  // Update template mutation (inline edit)
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: 'title' | 'difficulty_level'; value: string }) => {
      const { error } = await supabase
        .from('workout_templates')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-templates'] });
      toast.success('Scheda aggiornata');
    },
    onError: () => {
      toast.error('Errore durante l\'aggiornamento');
    },
  });

  // Delete exercise mutation (con check uso nelle schede)
  const deleteExerciseMutation = useMutation({
    mutationFn: async (exerciseId: string) => {
      const { count, error: countError } = await supabase
        .from('template_exercises')
        .select('*', { count: 'exact', head: true })
        .eq('exercise_id', exerciseId);
      if (countError) throw countError;
      if ((count || 0) > 0) {
        throw new Error(`Esercizio usato in ${count} scheda/e. Rimuovilo prima dalle schede.`);
      }
      const { error } = await supabase.from('exercises').delete().eq('id', exerciseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-exercises'] });
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      setDeleteExerciseId(null);
      toast.success('Esercizio eliminato');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Errore durante l\'eliminazione');
      setDeleteExerciseId(null);
    },
  });

  // Difficulty options for inline edit
  const difficultyOptions = [
    { value: 'principiante', label: 'Principiante' },
    { value: 'intermedio', label: 'Intermedio' },
    { value: 'avanzato', label: 'Avanzato' },
    { value: 'agonista', label: 'Agonista' },
  ];

  // Filter data
  const filteredTemplates = templates.filter((t) =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredWorkouts = workouts.filter((w) =>
    w.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeWorkouts = workouts.filter(w => w.status === 'attivo').length;
  const completedWorkouts = workouts.filter(w => w.status === 'completato').length;

  const templateColumns: Column<WorkoutTemplate>[] = [
    {
      key: 'title',
      header: 'Titolo',
      cell: (template) => (
        <div className="min-w-[200px]">
          <InlineEditText
            value={template.title}
            onSave={(value) => updateTemplateMutation.mutate({ id: template.id, field: 'title', value })}
            placeholder="Nome template..."
          />
          <p className="text-sm text-muted-foreground line-clamp-1 px-2">
            {template.description || 'Nessuna descrizione'}
          </p>
        </div>
      ),
    },
    {
      key: 'difficulty',
      header: 'Difficoltà',
      cell: (template) => (
        <InlineEditSelect
          value={template.difficulty_level}
          options={difficultyOptions}
          onSave={(value) => updateTemplateMutation.mutate({ id: template.id, field: 'difficulty_level', value })}
          placeholder="Seleziona..."
        />
      ),
    },
    {
      key: 'category',
      header: 'Categoria',
      cell: (template) => (
        <span className="capitalize">{template.category || 'N/A'}</span>
      ),
    },
    {
      key: 'duration',
      header: 'Durata',
      cell: (template) => (
        <span>{template.estimated_duration ? `${template.estimated_duration} min` : 'N/A'}</span>
      ),
    },
  ];

  const templateActions = (template: WorkoutTemplate) => (
    <div className="flex items-center gap-2">
      <Button 
        size="sm" 
        variant="ghost"
        onClick={() => navigate(`/pt/templates/${template.id}`)}
        title="Gestisci esercizi"
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button 
        size="sm" 
        variant="ghost"
        onClick={() => {
          setSelectedTemplateId(template.id);
          setIsAssignDialogOpen(true);
        }}
        title="Assegna ad atleta"
      >
        <UserPlus className="h-4 w-4" />
      </Button>
      <Button 
        size="sm" 
        variant="ghost" 
        title="Duplica"
        onClick={() => duplicateTemplateMutation.mutate(template.id)}
        disabled={duplicateTemplateMutation.isPending}
      >
        <Copy className="h-4 w-4" />
      </Button>
      <Button 
        size="sm" 
        variant="ghost" 
        className="text-destructive"
        onClick={() => deleteTemplateMutation.mutate(template.id)}
        title="Elimina"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  const workoutColumns: Column<Workout>[] = [
    {
      key: 'title',
      header: 'Allenamento',
      cell: (workout) => (
        <div>
          <p className="font-medium">{workout.title}</p>
          <p className="text-sm text-muted-foreground">
            {workout.scheduled_date 
              ? new Date(workout.scheduled_date).toLocaleDateString('it-IT')
              : 'Non programmato'
            }
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Stato',
      cell: (workout) => <StatusBadge status={workout.status} />,
    },
    {
      key: 'due_date',
      header: 'Scadenza',
      cell: (workout) => (
        <span className="text-sm">
          {workout.due_date 
            ? new Date(workout.due_date).toLocaleDateString('it-IT')
            : 'N/A'
          }
        </span>
      ),
    },
  ];

  const workoutActions = (workout: Workout) => (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="ghost">
        <Eye className="h-4 w-4" />
      </Button>
    </div>
  );

  const createButton = (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        onClick={() => {
          setActiveTab('programs');
          toast.info('Apri la tab Programmi per creare un nuovo programma');
        }}
      >
        <CalendarDays className="h-4 w-4 mr-2" />
        Nuovo Programma
      </Button>
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Crea Scheda
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg w-[calc(100%-2rem)] sm:w-full max-h-[calc(100vh-2rem)] !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Step 1 — Informazioni base</DialogTitle>
            <DialogDescription>
              Definisci i dati generali della scheda. Subito dopo entrerai nel builder con un blocco SET già pronto.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="title">Titolo scheda <span className="text-destructive">*</span></Label>
                <Input
                  id="title"
                  autoFocus
                  value={newTemplate.title}
                  onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                  placeholder="Es: Full Body Principiante"
                />
              </div>

              <div className="space-y-2">
                <Label>Gruppi muscolari coinvolti <span className="text-destructive">*</span></Label>
                <MultiSelectSearch
                  options={MUSCLE_GROUP_OPTIONS}
                  selected={newTemplate.muscle_groups}
                  onChange={(v) => setNewTemplate({ ...newTemplate, muscle_groups: v })}
                  placeholder="Seleziona gruppi muscolari..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficoltà <span className="text-destructive">*</span></Label>
                <Select
                  value={newTemplate.difficulty_level}
                  onValueChange={(v) => setNewTemplate({ ...newTemplate, difficulty_level: v })}
                >
                  <SelectTrigger id="difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="principiante">Principiante</SelectItem>
                    <SelectItem value="intermedio">Intermedio</SelectItem>
                    <SelectItem value="avanzato">Avanzato</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrizione (opzionale)</Label>
                <Textarea
                  id="description"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="Breve descrizione dell'allenamento..."
                  className="min-h-[70px]"
                />
              </div>

              <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
                💡 Categoria e durata sono modificabili in qualsiasi momento dalla scheda.
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Annulla
            </Button>
            <Button
              onClick={() => createTemplateMutation.mutate()}
              disabled={
                !newTemplate.title.trim() ||
                newTemplate.muscle_groups.length === 0 ||
                createTemplateMutation.isPending
              }
            >
              Continua
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title="Allenamenti"
        description="Crea e gestisci schede di allenamento"
        icon={Dumbbell}
        actions={createButton}
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Schede</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{templates.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Allenamenti Attivi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-warning" />
              <span className="text-2xl font-bold">{activeWorkouts}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completati</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-success" />
              <span className="text-2xl font-bold">{completedWorkouts}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Totale Assegnati</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{workouts.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Gestione Allenamenti</CardTitle>
              <CardDescription>Schede, programmi e allenamenti assegnati</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="templates" className="gap-2">
                <FileText className="h-4 w-4" />
                Schede ({templates.length})
              </TabsTrigger>
              <TabsTrigger value="programs" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Programmi
              </TabsTrigger>
              <TabsTrigger value="assigned" className="gap-2">
                <Dumbbell className="h-4 w-4" />
                Assegnati ({workouts.length})
              </TabsTrigger>
              <TabsTrigger value="exercises" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Esercizi ({exercises.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="templates" className="mt-4">
              <DataTable
                columns={templateColumns}
                data={filteredTemplates}
                isLoading={templatesLoading}
                emptyMessage="Nessuna scheda creata. Crea la tua prima scheda!"
                actions={templateActions}
              />
            </TabsContent>
            <TabsContent value="programs" className="mt-4">
              <ProgramsTab layout="grid" />
            </TabsContent>
            <TabsContent value="assigned" className="mt-4">
              <DataTable
                columns={workoutColumns}
                data={filteredWorkouts}
                isLoading={workoutsLoading}
                emptyMessage="Nessun allenamento assegnato"
                actions={workoutActions}
              />
            </TabsContent>
            <TabsContent value="exercises" className="mt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">
                    I tuoi esercizi preferiti, pronti da usare nelle schede.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/pt/exercises')}
                >
                  <Library className="h-4 w-4 mr-2" />
                  Sfoglia Archivio
                </Button>
              </div>
              {exercisesLoading ? (
                <p className="text-muted-foreground text-center py-8">Caricamento...</p>
              ) : exercises.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium text-foreground">Nessun esercizio preferito</p>
                  <p className="text-sm mt-1 max-w-md mx-auto">
                    Vai nell'Archivio Esercizi e aggiungi i tuoi preferiti per usarli nelle schede.
                  </p>
                  <Button className="mt-4" onClick={() => navigate('/pt/exercises')}>
                    <Library className="h-4 w-4 mr-2" />
                    Vai all'Archivio
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {exercises
                    .filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(ex => (
                      <div
                        key={ex.id}
                        className="flex items-start justify-between gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => setPreviewExercise(ex)}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="p-2 rounded-lg bg-muted shrink-0">
                            {ex.video_url ? (
                              <Video className="h-4 w-4 text-primary" />
                            ) : (
                              <Dumbbell className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{ex.name}</p>
                            {ex.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {ex.description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              <Badge variant="outline" className="text-xs capitalize">{ex.category}</Badge>
                              <Badge variant="secondary" className="text-xs capitalize">{ex.difficulty_level}</Badge>
                              {(ex.muscle_groups || []).slice(0, 3).map((m: string) => (
                                <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
                              ))}
                              {(ex.muscle_groups || []).length > 3 && (
                                <Badge variant="outline" className="text-xs">+{ex.muscle_groups.length - 3}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              toggleFav.mutate({ exerciseId: ex.id, isFavorite: true })
                            }
                            disabled={toggleFav.isPending}
                            title="Rimuovi dai preferiti"
                          >
                            <Star className="h-4 w-4 fill-primary text-primary" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Assign Workout Dialog */}
      <AssignWorkoutDialog
        open={isAssignDialogOpen}
        onOpenChange={(open) => {
          setIsAssignDialogOpen(open);
          if (!open) setSelectedTemplateId(null);
        }}
        preselectedTemplateId={selectedTemplateId || undefined}
      />

      {/* Create / Edit Exercise Dialog (stessa fonte dati del builder) */}
      <CreateExerciseDialog
        open={isCreateExerciseOpen}
        onOpenChange={(open) => {
          setIsCreateExerciseOpen(open);
          if (!open) setEditingExercise(null);
        }}
        exercise={editingExercise}
      />

      {/* Conferma eliminazione esercizio */}
      <AlertDialog open={!!deleteExerciseId} onOpenChange={(o) => !o && setDeleteExerciseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare l'esercizio?</AlertDialogTitle>
            <AlertDialogDescription>
              L'esercizio sarà rimosso dalla tua libreria. Se è già usato in qualche scheda,
              l'operazione verrà bloccata e dovrai prima rimuoverlo dalle schede.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteExerciseId && deleteExerciseMutation.mutate(deleteExerciseId)}
              disabled={deleteExerciseMutation.isPending}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default PTWorkoutsPage;
