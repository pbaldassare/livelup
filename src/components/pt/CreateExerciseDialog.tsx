import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Link2, Film, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { EXERCISE_ARCHIVE_CATEGORIES } from '@/lib/exerciseArchiveCategories';

interface ExerciseFormData {
  id?: string;
  name?: string;
  description?: string | null;
  category?: string;
  difficulty_level?: string;
  muscle_groups?: string[];
  instructions?: string | null;
  video_url?: string | null;
  image_url?: string | null;
  is_public?: boolean;
}

interface CreateExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se passato, il dialog è in modalità modifica */
  exercise?: ExerciseFormData | null;
}

const CATEGORIES = [...EXERCISE_ARCHIVE_CATEGORIES];

const MUSCLE_GROUPS = [
  'Petto', 'Schiena', 'Spalle', 'Bicipiti', 'Tricipiti',
  'Quadricipiti', 'Femorali', 'Glutei', 'Polpacci', 'Addominali',
  'Core', 'Full Body', 'Avambracci', 'Trapezio'
];

const emptyForm = {
  name: '',
  description: '',
  category: '',
  difficulty_level: 'nessuno',
  instructions: '',
  video_url: '',
  image_url: '',
};

type ExerciseInsert = Database['public']['Tables']['exercises']['Insert'];
type ExerciseUpdate = Database['public']['Tables']['exercises']['Update'];
type ExerciseDifficulty = Database['public']['Enums']['fitness_level'];

export function CreateExerciseDialog({ open, onOpenChange, exercise }: CreateExerciseDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [videoMode, setVideoMode] = useState<'link' | 'upload'>('link');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const isEditMode = !!exercise?.id;

  // Carica dati esistenti quando si apre in modalità edit
  useEffect(() => {
    if (open && exercise?.id) {
      setForm({
        name: exercise.name || '',
        description: exercise.description || '',
        category: exercise.category || '',
        difficulty_level: exercise.difficulty_level || 'nessuno',
        instructions: exercise.instructions || '',
        video_url: exercise.video_url || '',
        image_url: exercise.image_url || '',
      });
      setSelectedMuscles(exercise.muscle_groups || []);
      setIsPublic(!!exercise.is_public);
    } else if (open) {
      resetForm();
    }
  }, [open, exercise]);

  const toggleMuscle = (muscle: string) => {
    setSelectedMuscles(prev =>
      prev.includes(muscle) ? prev.filter(m => m !== muscle) : [...prev, muscle]
    );
  };

  const handleVideoUpload = async (file: File) => {
    if (!user?.id) return;
    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('exercise-videos')
        .upload(path, file, { upsert: true, cacheControl: '31536000' });
      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('exercise-videos')
        .getPublicUrl(path);

      setForm(prev => ({ ...prev, video_url: urlData.publicUrl }));
      toast.success('Video caricato');
    } catch {
      toast.error('Errore upload video');
    } finally {
      setIsUploading(false);
    }
  };

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      const basePayload = {
        name: form.name,
        description: form.description || null,
        category: form.category,
        difficulty_level: form.difficulty_level as ExerciseDifficulty,
        muscle_groups: selectedMuscles,
        instructions: form.instructions || null,
        video_url: form.video_url || null,
        image_url: form.image_url || null,
        is_public: isPublic,
      };

      if (isEditMode && exercise?.id) {
        const payload: ExerciseUpdate = basePayload;
        const { error } = await supabase
          .from('exercises')
          .update(payload)
          .eq('id', exercise.id);
        if (error) throw error;
      } else {
        const insertPayload: ExerciseInsert = {
          ...basePayload,
          created_by: user.id,
          is_public: isPublic,
        };

        const { error } = await supabase.from('exercises').insert(insertPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-exercises'] });
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      queryClient.invalidateQueries({ queryKey: ['admin-exercises'] });
      queryClient.invalidateQueries({ queryKey: ['template-exercises'] });
      queryClient.invalidateQueries({ queryKey: ['pt-exercises-archive'] });
      queryClient.invalidateQueries({ queryKey: ['template-exercises-library'] });
      toast.success(isEditMode ? 'Esercizio aggiornato' : 'Esercizio creato con successo');
      resetForm();
      onOpenChange(false);
    },
    onError: () => toast.error(isEditMode ? 'Errore nell\'aggiornamento' : 'Errore nella creazione'),
  });

  const resetForm = () => {
    setForm(emptyForm);
    setSelectedMuscles([]);
    setIsPublic(false);
    setVideoMode('link');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[calc(100%-2rem)] max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Modifica Esercizio' : 'Crea Esercizio'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Le modifiche si applicheranno anche alle schede che lo utilizzano'
              : 'Aggiungi un nuovo esercizio alla tua libreria personale'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label>Nome esercizio *</Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Es: Squat bulgaro" />
          </div>

          {/* Descrizione breve */}
          <div className="space-y-1.5">
            <Label>Descrizione</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Breve descrizione dell'esercizio..."
              className="min-h-[60px]"
            />
          </div>

          {/* Categoria + Difficoltà */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoria *</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Difficoltà</Label>
              <Select value={form.difficulty_level} onValueChange={v => setForm(p => ({ ...p, difficulty_level: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nessuno">Nessuno</SelectItem>
                  <SelectItem value="principiante">Principiante</SelectItem>
                  <SelectItem value="intermedio">Intermedio</SelectItem>
                  <SelectItem value="avanzato">Avanzato</SelectItem>
                  <SelectItem value="agonista">Agonista</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Muscoli */}
          <div className="space-y-1.5">
            <Label>Muscoli coinvolti *</Label>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLE_GROUPS.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMuscle(m)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedMuscles.includes(m)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Istruzioni */}
          <div className="space-y-1.5">
            <Label>Istruzioni di esecuzione</Label>
            <Textarea
              value={form.instructions}
              onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))}
              placeholder="Descrivi l'esecuzione corretta..."
              className="min-h-[80px]"
            />
          </div>

          {/* Condivisione archivio */}
          <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
            <div className="space-y-0.5 min-w-0">
              <Label htmlFor="exercise-is-public" className="cursor-pointer">
                Condividi nell&apos;archivio generale
              </Label>
              <p className="text-xs text-muted-foreground">
                Di default resta in &quot;I miei&quot;. Attiva per renderlo visibile a tutti i coach nell&apos;archivio.
              </p>
            </div>
            <Switch
              id="exercise-is-public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
              className="mt-0.5 shrink-0"
            />
          </div>

          {/* Video */}
          <div className="space-y-1.5">
            <Label>Video esercizio</Label>
            <Tabs value={videoMode} onValueChange={v => setVideoMode(v as 'link' | 'upload')}>
              <TabsList className="w-full">
                <TabsTrigger value="link" className="flex-1 gap-1.5">
                  <Link2 className="h-3.5 w-3.5" />
                  Link esterno
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex-1 gap-1.5">
                  <Upload className="h-3.5 w-3.5" />
                  Carica video
                </TabsTrigger>
              </TabsList>
              <TabsContent value="link" className="mt-2">
                <Input
                  value={form.video_url}
                  onChange={e => setForm(p => ({ ...p, video_url: e.target.value }))}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </TabsContent>
              <TabsContent value="upload" className="mt-2">
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                  {form.video_url && videoMode === 'upload' ? (
                    <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
                      <Film className="h-4 w-4" />
                      <span>Video caricato</span>
                      <Button variant="ghost" size="sm" onClick={() => setForm(p => ({ ...p, video_url: '' }))}>Rimuovi</Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleVideoUpload(file);
                        }}
                        disabled={isUploading}
                      />
                      {isUploading ? (
                        <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Caricamento...
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          <Upload className="h-6 w-6 mx-auto mb-1" />
                          Clicca per caricare un video
                        </div>
                      )}
                    </label>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button
            onClick={() => upsertMutation.mutate()}
            disabled={!form.name || !form.category || selectedMuscles.length === 0 || upsertMutation.isPending}
          >
            {upsertMutation.isPending
              ? (isEditMode ? 'Salvataggio...' : 'Creazione...')
              : (isEditMode ? 'Salva modifiche' : 'Crea Esercizio')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreateExerciseDialog;
