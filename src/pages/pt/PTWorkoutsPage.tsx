import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

import { InlineEditSelect } from '@/components/dashboard/InlineEditCells';
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
  ChevronRight,
} from 'lucide-react';
import { ProgramsTab } from '@/components/pt/ProgramsTab';
import { ProtocolsTab } from '@/components/pt/ProtocolsTab';
import { ImportTemplateDialog } from '@/components/pt/ImportTemplateDialog';
import {
  ReviewImportedTemplateDialog,
  type ImportedTemplate,
} from '@/components/pt/ReviewImportedTemplateDialog';
import { Sliders, Upload } from 'lucide-react';
import { usePTRoutes } from '@/hooks/usePTRoutes';

/** Import AI da file — nascosto finché la feature non è pronta in produzione. */
const SHOW_IMPORT_SCHEDA = false;
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

const TEMPLATE_CATEGORIES = [
  { value: 'Forza', label: 'Forza' },
  { value: 'Ipertrofia', label: 'Ipertrofia' },
  { value: 'Cardio', label: 'Cardio' },
  { value: 'HIIT', label: 'HIIT' },
  { value: 'Total Body', label: 'Total Body' },
  { value: 'Mobilità', label: 'Mobilità' },
  { value: 'Funzionale', label: 'Funzionale' },
  { value: 'Calisthenics', label: 'Calisthenics' },
  { value: 'Dimagrimento', label: 'Dimagrimento' },
  { value: 'Powerlifting', label: 'Powerlifting' },
  { value: 'Altro', label: 'Altro' },
];

const MUSCLE_GROUP_OPTIONS = [
  { id: 'petto', name: 'Petto' },
  { id: 'full body', name: 'Full Body' },
  { id: 'schiena', name: 'Schiena' },
  { id: 'gambe', name: 'Gambe' },
  { id: 'spalle', name: 'Spalle' },
  { id: 'braccia', name: 'Braccia' },
  { id: 'core', name: 'Core' },
  { id: 'glutei', name: 'Glutei' },
  { id: 'addominali', name: 'Addominali' },
  { id: 'cardio', name: 'Cardio' },
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

export function PTWorkoutsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { routes } = usePTRoutes(embedded);
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('templates');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [importedData, setImportedData] = useState<ImportedTemplate | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isSavingImport, setIsSavingImport] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isCreateExerciseOpen, setIsCreateExerciseOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<any | null>(null);
  const [deleteExerciseId, setDeleteExerciseId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editExercisesDialogOpen, setEditExercisesDialogOpen] = useState(false);
  const [editTemplateDialog, setEditTemplateDialog] = useState<{
    id: string;
    title: string;
    description: string;
  } | null>(null);
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
    difficulty_level: '',
    category: '',
    estimated_duration: 60,
    muscle_groups: [],
  });

  const tabFromUrl = searchParams.get('tab');
  useEffect(() => {
    const allowed = ['templates', 'programs', 'assigned', 'exercises', 'protocols'];
    if (tabFromUrl && allowed.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === 'templates') {
      next.delete('tab');
    } else {
      next.set('tab', tab);
    }
    setSearchParams(next, { replace: true });
  };

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

      // 1. Crea la scheda
      const { data: created, error } = await supabase
        .from('workout_templates')
        .insert({
          pt_user_id: user.id,
          title: newTemplate.title.trim(),
          description: newTemplate.description || null,
          difficulty_level: (newTemplate.difficulty_level || 'nessuno') as
            | 'principiante'
            | 'intermedio'
            | 'avanzato'
            | 'agonista'
            | 'nessuno',
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
        difficulty_level: '',
        category: '',
        estimated_duration: 60,
        muscle_groups: [],
      });
      navigate(routes.template(created.id));
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

  // Update template mutation (inline edit + dialog)
  const updateTemplateMutation = useMutation({
    mutationFn: async ({
      id,
      field,
      value,
    }: {
      id: string;
      field: 'title' | 'difficulty_level' | 'category' | 'description';
      value: string;
    }) => {
      const payload =
        field === 'description'
          ? { description: value.trim() || null, updated_at: new Date().toISOString() }
          : { [field]: value, updated_at: new Date().toISOString() };
      const { error } = await supabase
        .from('workout_templates')
        .update(payload)
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

  const saveEditTemplateDialogMutation = useMutation({
    mutationFn: async ({
      id,
      title,
      description,
    }: {
      id: string;
      title: string;
      description: string;
    }) => {
      const { error } = await supabase
        .from('workout_templates')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-templates'] });
      toast.success('Scheda aggiornata');
      setEditTemplateDialog(null);
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
    { value: 'nessuno', label: 'Non specificato' },
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

  const saveEditTemplateDialog = () => {
    if (!editTemplateDialog) return;
    const title = editTemplateDialog.title.trim();
    if (!title) {
      toast.error('Inserisci un titolo');
      return;
    }
    saveEditTemplateDialogMutation.mutate({
      id: editTemplateDialog.id,
      title,
      description: editTemplateDialog.description,
    });
  };

  const templateColumns: Column<WorkoutTemplate>[] = [
    {
      key: 'title',
      header: 'Titolo',
      cell: (template) => (
        <div className="min-w-[200px]">
          <button
            type="button"
            onClick={() => navigate(routes.template(template.id))}
            className="font-medium text-left hover:text-primary hover:underline px-2 py-0.5 rounded -mx-2 w-full truncate"
            title="Apri scheda"
          >
            {template.title}
          </button>
          <p className="text-sm text-muted-foreground line-clamp-1 px-2">
            {template.description || 'Nessuna descrizione'}
          </p>
        </div>
      ),
    },
    {
      key: 'difficulty',
      header: 'Livello',
      cell: (template) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditSelect
            value={template.difficulty_level}
            options={difficultyOptions}
            onSave={(value) => updateTemplateMutation.mutate({ id: template.id, field: 'difficulty_level', value })}
            placeholder="Seleziona..."
          />
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Categoria',
      cell: (template) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditSelect
            value={template.category}
            options={TEMPLATE_CATEGORIES}
            onSave={(value) => updateTemplateMutation.mutate({ id: template.id, field: 'category', value })}
            placeholder="Seleziona..."
          />
        </div>
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
        title="Modifica nome e descrizione"
        onClick={(e) => {
          e.stopPropagation();
          setEditTemplateDialog({
            id: template.id,
            title: template.title,
            description: template.description ?? '',
          });
        }}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button 
        size="sm" 
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
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
        onClick={(e) => {
          e.stopPropagation();
          duplicateTemplateMutation.mutate(template.id);
        }}
        disabled={duplicateTemplateMutation.isPending}
      >
        <Copy className="h-4 w-4" />
      </Button>
      <Button 
        size="sm" 
        variant="ghost" 
        className="text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          deleteTemplateMutation.mutate(template.id);
        }}
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
      <Button
        size="sm"
        variant="ghost"
        title="Vai all'atleta"
        onClick={(e) => {
          e.stopPropagation();
          navigate(routes.athlete(workout.atleta_user_id));
        }}
      >
        <Eye className="h-4 w-4" />
      </Button>
    </div>
  );

  const createButton = (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        onClick={() => {
          handleTabChange('programs');
          toast.info('Apri la tab Programmi per creare un nuovo programma');
        }}
      >
        <CalendarDays className="h-4 w-4 mr-2" />
        Nuovo Programma
      </Button>
      {SHOW_IMPORT_SCHEDA && (
        <Button
          variant="outline"
          onClick={() => setIsImportDialogOpen(true)}
        >
          <Upload className="h-4 w-4 mr-2" />
          Importa scheda
        </Button>
      )}
      {SHOW_IMPORT_SCHEDA && (
      <ImportTemplateDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        isLoading={isImportLoading}
        onAnalyze={async (file) => {
          try {
            setIsImportLoading(true);
            const file_base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                // result is "data:<mime>;base64,<data>"
                const base64 = result.split(',')[1] ?? '';
                resolve(base64);
              };
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(file);
            });

            const { data, error } = await supabase.functions.invoke(
              'import-workout-schema',
              { body: { file_base64, mime_type: file.type } }
            );
            if (error) throw error;
            if (!data || !Array.isArray(data?.exercises)) {
              throw new Error('Risposta non valida');
            }

            setImportedData(data as ImportedTemplate);
            setIsImportDialogOpen(false);
            setIsReviewDialogOpen(true);
          } catch (e) {
            console.error('Import scheda error:', e);
            toast.error('Errore nell\'analisi del file — riprova');
          } finally {
            setIsImportLoading(false);
          }
        }}
      />
      )}
      {SHOW_IMPORT_SCHEDA && (
      <ReviewImportedTemplateDialog
        open={isReviewDialogOpen}
        onOpenChange={setIsReviewDialogOpen}
        data={importedData}
        isSaving={isSavingImport}
        onSave={async (payload) => {
          if (!user?.id) return;
          try {
            setIsSavingImport(true);
            const { importTemplateFromAI } = await import('@/lib/api/workouts');
            await importTemplateFromAI({
              ptUserId: user.id,
              templateName: payload.template_name,
              exercises: payload.exercises,
            });
            await queryClient.invalidateQueries({ queryKey: ['pt-templates'] });
            toast.success('Scheda importata con successo');
            setIsReviewDialogOpen(false);
            setImportedData(null);
          } catch (e) {
            console.error('Salvataggio scheda importata fallito:', e);
            toast.error('Errore nel salvataggio — riprova');
          } finally {
            setIsSavingImport(false);
          }
        }}
      />
      )}


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
                <Label>Gruppi muscolari coinvolti (opzionale)</Label>
                <MultiSelectSearch
                  options={MUSCLE_GROUP_OPTIONS}
                  selected={newTemplate.muscle_groups}
                  onChange={(v) => setNewTemplate({ ...newTemplate, muscle_groups: v })}
                  placeholder="Seleziona gruppi muscolari..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="livello">Livello (opzionale)</Label>
                <Select
                  value={newTemplate.difficulty_level || undefined}
                  onValueChange={(v) => setNewTemplate({ ...newTemplate, difficulty_level: v })}
                >
                  <SelectTrigger id="livello">
                    <SelectValue placeholder="Seleziona livello..." />
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
      {!embedded && (
        <PageHeader
          title="Allenamenti"
          description="Crea e gestisci schede di allenamento"
          icon={Dumbbell}
          actions={createButton}
        />
      )}
      {embedded && <div className="flex justify-end">{createButton}</div>}

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
          <Tabs value={activeTab} onValueChange={handleTabChange}>
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
              <TabsTrigger value="protocols" className="gap-2">
                <Sliders className="h-4 w-4" />
                Protocolli
              </TabsTrigger>
            </TabsList>
            <TabsContent value="templates" className="mt-4">
              {embedded ? (
                templatesLoading ? (
                  <p className="text-muted-foreground text-center py-8">Caricamento...</p>
                ) : filteredTemplates.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nessuna scheda creata. Crea la tua prima scheda!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredTemplates.map((template) => (
                      <Card
                        key={template.id}
                        className="overflow-hidden hover:border-primary/30 transition-colors"
                      >
                        <CardContent className="p-4">
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => navigate(routes.template(template.id))}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold truncate">{template.title}</p>
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                                  {template.description || 'Nessuna descrizione'}
                                </p>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {template.difficulty_level && template.difficulty_level !== 'nessuno' && (
                                    <Badge variant="secondary" className="text-xs capitalize">
                                      {template.difficulty_level}
                                    </Badge>
                                  )}
                                  {template.category && (
                                    <Badge variant="outline" className="text-xs">{template.category}</Badge>
                                  )}
                                  {template.estimated_duration && (
                                    <Badge variant="outline" className="text-xs">
                                      {template.estimated_duration} min
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            </div>
                          </button>
                          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border">
                            {templateActions(template)}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )
              ) : (
                <DataTable
                  columns={templateColumns}
                  data={filteredTemplates}
                  isLoading={templatesLoading}
                  emptyMessage="Nessuna scheda creata. Crea la tua prima scheda!"
                  actions={templateActions}
                  onRowClick={(template) => navigate(routes.template(template.id))}
                />
              )}
            </TabsContent>
            <TabsContent value="programs" className="mt-4">
              <ProgramsTab layout="grid" />
            </TabsContent>
            <TabsContent value="assigned" className="mt-4">
              {embedded ? (
                workoutsLoading ? (
                  <p className="text-muted-foreground text-center py-8">Caricamento...</p>
                ) : filteredWorkouts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nessun allenamento assegnato</p>
                ) : (
                  <div className="space-y-2">
                    {filteredWorkouts.map((workout) => (
                      <Card
                        key={workout.id}
                        className="overflow-hidden hover:border-primary/30 transition-colors cursor-pointer"
                        onClick={() => navigate(routes.athlete(workout.atleta_user_id))}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold truncate">{workout.title}</p>
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {workout.scheduled_date
                                  ? new Date(workout.scheduled_date).toLocaleDateString('it-IT')
                                  : 'Non programmato'}
                              </p>
                              {workout.due_date && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Scadenza: {new Date(workout.due_date).toLocaleDateString('it-IT')}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <StatusBadge status={workout.status} />
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )
              ) : (
                <DataTable
                  columns={workoutColumns}
                  data={filteredWorkouts}
                  isLoading={workoutsLoading}
                  emptyMessage="Nessun allenamento assegnato"
                  actions={workoutActions}
                />
              )}
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
                  onClick={() => navigate(routes.exercises)}
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
                  <Button className="mt-4" onClick={() => navigate(routes.exercises)}>
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
                          <div className="relative h-14 w-14 overflow-hidden rounded-lg border bg-muted shrink-0 flex items-center justify-center">
                            {ex.image_url ? (
                              <img src={ex.image_url} alt={ex.name} className="h-full w-full object-cover" loading="lazy" />
                            ) : ex.video_url ? (
                              <Video className="h-5 w-5 text-primary" />
                            ) : (
                              <Dumbbell className="h-5 w-5 text-muted-foreground" />
                            )}
                            {ex.video_url && ex.image_url && (
                              <span className="absolute bottom-1 right-1 rounded-full bg-background/90 p-1 shadow-sm">
                                <Video className="h-3 w-3 text-primary" />
                              </span>
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
            <TabsContent value="protocols" className="mt-4">
              <ProtocolsTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modifica scheda (titolo + descrizione) */}
      <Dialog
        open={!!editTemplateDialog}
        onOpenChange={(open) => {
          if (!open) setEditTemplateDialog(null);
        }}
      >
        <DialogContent className="max-w-md w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>Modifica scheda</DialogTitle>
            <DialogDescription>
              Aggiorna titolo e descrizione. Per esercizi e protocolli apri la scheda cliccando sul nome.
            </DialogDescription>
          </DialogHeader>
          {editTemplateDialog && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="edit-template-title">Titolo scheda</Label>
                <Input
                  id="edit-template-title"
                  autoFocus
                  value={editTemplateDialog.title}
                  onChange={(e) =>
                    setEditTemplateDialog({ ...editTemplateDialog, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-template-description">Descrizione (opzionale)</Label>
                <Textarea
                  id="edit-template-description"
                  value={editTemplateDialog.description}
                  onChange={(e) =>
                    setEditTemplateDialog({ ...editTemplateDialog, description: e.target.value })
                  }
                  placeholder="Breve descrizione..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditTemplateDialog(null)}>
              Annulla
            </Button>
            <Button
              onClick={saveEditTemplateDialog}
              disabled={saveEditTemplateDialogMutation.isPending || !editTemplateDialog?.title.trim()}
            >
              {saveEditTemplateDialogMutation.isPending ? 'Salvataggio…' : 'Salva'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
