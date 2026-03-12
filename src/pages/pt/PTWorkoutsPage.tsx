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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

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
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';

// =====================================================
// PT WORKOUTS PAGE - Gestione Allenamenti
// Solo per ruolo: pt (web dashboard)
// =====================================================

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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editExercisesDialogOpen, setEditExercisesDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    title: '',
    description: '',
    difficulty_level: 'intermedio',
    category: '',
    estimated_duration: 60,
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

  // Fetch assigned workouts
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

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('workout_templates')
        .insert({
          pt_user_id: user.id,
          title: newTemplate.title,
          description: newTemplate.description || null,
          difficulty_level: newTemplate.difficulty_level as 'principiante' | 'intermedio' | 'avanzato',
          category: newTemplate.category || null,
          estimated_duration: newTemplate.estimated_duration,
          is_public: false,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-templates'] });
      toast.success('Template creato con successo');
      setIsCreateDialogOpen(false);
      setNewTemplate({
        title: '',
        description: '',
        difficulty_level: 'intermedio',
        category: '',
        estimated_duration: 60,
      });
    },
    onError: () => {
      toast.error('Errore durante la creazione del template');
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
      toast.success('Template eliminato');
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
      toast.success('Template duplicato con successo');
    },
    onError: () => {
      toast.error('Errore durante la duplicazione del template');
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
      toast.success('Template aggiornato');
    },
    onError: () => {
      toast.error('Errore durante l\'aggiornamento');
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
    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl w-[calc(100%-2rem)] sm:w-full max-h-[calc(100vh-2rem)] !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Crea Nuovo Template</DialogTitle>
          <DialogDescription>
            Crea un nuovo template di allenamento riutilizzabile
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto pr-4">
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titolo *</Label>
              <Input
                id="title"
                value={newTemplate.title}
                onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                placeholder="Es: Full Body Principiante"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrizione</Label>
              <Textarea
                id="description"
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                placeholder="Descrivi l'allenamento..."
                className="min-h-[80px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Difficoltà</Label>
                <Select
                  value={newTemplate.difficulty_level}
                  onValueChange={(value) => setNewTemplate({ ...newTemplate, difficulty_level: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="principiante">Principiante</SelectItem>
                    <SelectItem value="intermedio">Intermedio</SelectItem>
                    <SelectItem value="avanzato">Avanzato</SelectItem>
                    <SelectItem value="agonista">Agonista</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Durata (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={5}
                  max={180}
                  value={newTemplate.estimated_duration}
                  onChange={(e) => setNewTemplate({ ...newTemplate, estimated_duration: parseInt(e.target.value) || 60 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Input
                id="category"
                value={newTemplate.category}
                onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                placeholder="Es: Forza, Cardio, HIIT, Mobilità"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
            Annulla
          </Button>
          <Button 
            onClick={() => createTemplateMutation.mutate()}
            disabled={!newTemplate.title || createTemplateMutation.isPending}
          >
            Crea Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
            <CardTitle className="text-sm font-medium">Template</CardTitle>
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
              <CardDescription>Template e allenamenti assegnati</CardDescription>
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
            <TabsList>
              <TabsTrigger value="templates" className="gap-2">
                <FileText className="h-4 w-4" />
                Template ({templates.length})
              </TabsTrigger>
              <TabsTrigger value="assigned" className="gap-2">
                <Dumbbell className="h-4 w-4" />
                Assegnati ({workouts.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="templates" className="mt-4">
              <DataTable
                columns={templateColumns}
                data={filteredTemplates}
                isLoading={templatesLoading}
                emptyMessage="Nessun template creato. Crea il tuo primo template!"
                actions={templateActions}
              />
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
          </Tabs>
        </CardContent>
      </Card>

      {/* Assign Workout Dialog */}
      <AssignWorkoutDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        preselectedTemplateId={selectedTemplateId || undefined}
      />
    </div>
  );
}

export default PTWorkoutsPage;
