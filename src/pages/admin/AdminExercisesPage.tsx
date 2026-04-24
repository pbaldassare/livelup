import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Video,
  Library,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Upload,
  X,
  Link2,
  Loader2,
  Dumbbell,
} from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { ExerciseDetailDialog } from '@/components/exercises/ExerciseDetailDialog';
import { cn } from '@/lib/utils';

type Exercise = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  muscle_groups: string[];
  difficulty_level: string;
  video_url: string | null;
  image_url: string | null;
  instructions: string | null;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
};

const CATEGORIES = [
  'Forza', 'Cardio', 'Mobilità', 'Funzionale', 'Calisthenics',
  'Kettlebell', 'Stretching', 'Posturale', 'Pilates', 'Yoga',
];

const MUSCLE_GROUPS = [
  'Petto', 'Schiena', 'Spalle', 'Bicipiti', 'Tricipiti',
  'Quadricipiti', 'Femorali', 'Glutei', 'Polpacci', 'Addominali',
  'Core', 'Avambracci', 'Trapezio', 'Full Body',
];

const DIFFICULTY_LEVELS = [
  { value: 'principiante', label: 'Principiante' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzato', label: 'Avanzato' },
];

const emptyForm = {
  name: '',
  description: '',
  category: 'Forza',
  muscle_groups: [] as string[],
  difficulty_level: 'intermedio',
  video_url: '',
  image_url: '',
  instructions: '',
};

function getYouTubeVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&?/\s]+)/);
  return match ? match[1] : null;
}

function getVimeoVideoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function VideoPreview({ url, title }: { url: string; title: string }) {
  if (!url) return null;
  const youtubeId = getYouTubeVideoId(url);
  const vimeoId = getVimeoVideoId(url);

  if (youtubeId) {
    return (
      <div className="overflow-hidden rounded-lg border bg-muted">
        <div className="aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?modestbranding=1&rel=0`}
            title={title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  if (vimeoId) {
    return (
      <div className="overflow-hidden rounded-lg border bg-muted">
        <div className="aspect-video">
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}`}
            title={title}
            className="h-full w-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3 text-sm text-primary hover:underline"
    >
      <span className="inline-flex min-w-0 items-center gap-2 truncate">
        <Video className="h-4 w-4 shrink-0" />
        <span className="truncate">Apri video tutorial</span>
      </span>
      <ExternalLink className="h-4 w-4 shrink-0" />
    </a>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default function AdminExercisesPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null);
  const [imageUploadPending, setImageUploadPending] = useState(false);

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['admin-exercises'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('category')
        .order('name');
      if (error) throw error;
      return data as Exercise[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      const payload = {
        name: values.name.trim(),
        description: values.description.trim() || null,
        category: values.category,
        muscle_groups: values.muscle_groups,
        difficulty_level: values.difficulty_level as 'principiante' | 'intermedio' | 'avanzato',
        video_url: values.video_url.trim() || null,
        image_url: values.image_url.trim() || null,
        instructions: values.instructions.trim(),
        is_public: true,
        created_by: null as string | null,
      };

      if (values.id) {
        const { error } = await supabase
          .from('exercises')
          .update(payload)
          .eq('id', values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('exercises')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-exercises'] });
      queryClient.invalidateQueries({ queryKey: ['pt-exercises-archive'] });
      queryClient.invalidateQueries({ queryKey: ['pt-favorite-exercises'] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast.success(editingId ? 'Esercizio aggiornato' : 'Esercizio creato');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const usageQuery = useQuery({
    queryKey: ['exercise-usage', deleteId],
    queryFn: async () => {
      if (!deleteId) return { templates: 0, workouts: 0, favorites: 0 };
      const [tpl, wko, fav] = await Promise.all([
        supabase.from('template_exercises').select('id', { count: 'exact', head: true }).eq('exercise_id', deleteId),
        supabase.from('workout_exercises').select('id', { count: 'exact', head: true }).eq('exercise_id', deleteId),
        supabase.from('pt_favorite_exercises').select('id', { count: 'exact', head: true }).eq('exercise_id', deleteId),
      ]);
      return {
        templates: tpl.count ?? 0,
        workouts: wko.count ?? 0,
        favorites: fav.count ?? 0,
      };
    },
    enabled: !!deleteId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exercises').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-exercises'] });
      setDeleteId(null);
      toast.success('Esercizio eliminato');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (ex: Exercise) => {
    setEditingId(ex.id);
    setForm({
      name: ex.name,
      description: ex.description || '',
      category: ex.category,
      muscle_groups: ex.muscle_groups || [],
      difficulty_level: ex.difficulty_level,
      video_url: ex.video_url || '',
      image_url: ex.image_url || '',
      instructions: ex.instructions || '',
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Seleziona un'immagine valida");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'immagine deve essere inferiore a 5MB");
      return;
    }

    setImageUploadPending(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const safeId = editingId || crypto.randomUUID();
      const path = `admin/${safeId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('exercise-images')
        .upload(path, file, { upsert: true });
      if (error) throw error;

      const { data } = supabase.storage
        .from('exercise-images')
        .getPublicUrl(path);

      setForm(prev => ({ ...prev, image_url: `${data.publicUrl}?t=${Date.now()}` }));
      toast.success('Immagine caricata');
    } catch (err: any) {
      toast.error(err?.message || "Errore durante l'upload immagine");
    } finally {
      setImageUploadPending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = () => {
    const name = form.name.trim();
    const instructions = form.instructions.trim();
    const description = form.description.trim();
    const videoUrl = form.video_url.trim();
    const imageUrl = form.image_url.trim();

    if (!name) {
      toast.error('Il nome è obbligatorio');
      return;
    }
    if (name.length > 120) {
      toast.error('Il nome non può superare 120 caratteri');
      return;
    }
    if (!instructions) {
      toast.error('Le istruzioni di esecuzione sono obbligatorie');
      return;
    }
    if (instructions.length > 4000) {
      toast.error('Le istruzioni non possono superare 4000 caratteri');
      return;
    }
    if (description.length > 2000) {
      toast.error('I consigli non possono superare 2000 caratteri');
      return;
    }
    if (!['principiante', 'intermedio', 'avanzato'].includes(form.difficulty_level)) {
      toast.error('Seleziona un livello di difficoltà valido');
      return;
    }
    if (videoUrl && !isValidUrl(videoUrl)) {
      toast.error('Inserisci un URL video valido');
      return;
    }
    if (imageUrl && !isValidUrl(imageUrl)) {
      toast.error('Inserisci un URL immagine valido');
      return;
    }
    upsertMutation.mutate(editingId ? { ...form, id: editingId } : form);
  };

  const toggleMuscleGroup = (mg: string) => {
    setForm(prev => ({
      ...prev,
      muscle_groups: prev.muscle_groups.includes(mg)
        ? prev.muscle_groups.filter(m => m !== mg)
        : [...prev.muscle_groups, mg],
    }));
  };

  const filtered = exercises.filter(ex => {
    const matchesSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'all' || ex.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Archivio Esercizi"
        subtitle="Catalogo ufficiale della piattaforma — gestione esercizi"
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca esercizio..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le categorie</SelectItem>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Aggiungi
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Library className="h-5 w-5" />
            Esercizi ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-muted-foreground">Caricamento...</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nessun esercizio trovato</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[76px]">Media</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="hidden md:table-cell">Muscoli</TableHead>
                  <TableHead className="hidden md:table-cell">Livello</TableHead>
                  <TableHead className="hidden lg:table-cell">Video</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(ex => (
                  <TableRow key={ex.id}>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => setPreviewExercise(ex)}
                        className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border bg-muted transition-opacity hover:opacity-85"
                        title="Apri anteprima"
                      >
                        {ex.image_url ? (
                          <img src={ex.image_url} alt={ex.name} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <Dumbbell className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="font-medium">{ex.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ex.category}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(ex.muscle_groups || []).slice(0, 3).map(mg => (
                          <Badge key={mg} variant="outline" className="text-xs">{mg}</Badge>
                        ))}
                        {(ex.muscle_groups || []).length > 3 && (
                          <Badge variant="outline" className="text-xs">+{ex.muscle_groups.length - 3}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell capitalize">
                      {ex.difficulty_level}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {ex.video_url ? (
                        <button
                          type="button"
                          onClick={() => setPreviewExercise(ex)}
                          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-primary transition-colors hover:bg-primary/5"
                        >
                          <Video className="h-3.5 w-3.5" />
                          Tutorial
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setPreviewExercise(ex)} title="Anteprima">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(ex)} title="Modifica">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(ex.id)} title="Elimina">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-2rem)] max-w-[820px] flex-col overflow-hidden p-0">
          <DialogHeader className="border-b px-5 py-5 sm:px-6">
            <DialogTitle className="text-2xl font-bold">{editingId ? 'Modifica Esercizio' : 'Nuovo Esercizio'}</DialogTitle>
            <DialogDescription>
              Editor esercizio con dati condivisi automaticamente tra Admin, PT e atleta.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
            <FormSection title="Informazioni base">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  maxLength={120}
                  placeholder="Es. Push up"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Istruzioni esecuzione *</Label>
                <Textarea
                  value={form.instructions}
                  onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))}
                  rows={6}
                  maxLength={4000}
                  placeholder="Descrivi setup, movimento, respirazione e punti tecnici principali..."
                  className="min-h-[150px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Consigli aggiuntivi</Label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                  maxLength={2000}
                  placeholder="Note opzionali, errori comuni, regressioni o progressioni..."
                />
              </div>
            </FormSection>

            <FormSection title="Classificazione">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Livello</Label>
                  <Select value={form.difficulty_level} onValueChange={v => setForm(p => ({ ...p, difficulty_level: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DIFFICULTY_LEVELS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Gruppi muscolari</Label>
                <div className="flex flex-wrap gap-1.5">
                  {MUSCLE_GROUPS.map(mg => (
                    <Badge
                      key={mg}
                      variant={form.muscle_groups.includes(mg) ? 'default' : 'outline'}
                      className="cursor-pointer select-none px-3 py-1"
                      onClick={() => toggleMuscleGroup(mg)}
                    >
                      {mg}
                    </Badge>
                  ))}
                </div>
              </div>
            </FormSection>

            <FormSection title="Media esercizio">
              <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                <div className="space-y-2">
                  <Label>Immagine esercizio</Label>
                  <div className="overflow-hidden rounded-xl border bg-muted">
                    <div className="flex aspect-[4/3] items-center justify-center">
                      {form.image_url ? (
                        <img src={form.image_url} alt="Preview esercizio" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                          <ImageIcon className="h-9 w-9" />
                          <span className="text-xs font-medium">Immagine consigliata</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={imageUploadPending}
                    >
                      {imageUploadPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      {form.image_url ? 'Sostituisci' : 'Carica'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setForm(p => ({ ...p, image_url: '' }))}
                      disabled={!form.image_url || imageUploadPending}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Rimuovi
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      Image URL fallback
                    </Label>
                    <Input
                      value={form.image_url}
                      onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Video tutorial</Label>
                    <div className="flex gap-2">
                      <Input
                        value={form.video_url}
                        onChange={e => setForm(p => ({ ...p, video_url: e.target.value }))}
                        placeholder="YouTube o Vimeo URL"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setForm(p => ({ ...p, video_url: '' }))}
                        disabled={!form.video_url}
                        title="Rimuovi video"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {form.video_url && isValidUrl(form.video_url) ? (
                      <VideoPreview url={form.video_url} title={form.name || 'Video tutorial'} />
                    ) : (
                      <div className={cn(
                        'flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground',
                        form.video_url && 'border-destructive/40 text-destructive'
                      )}>
                        <Video className="h-4 w-4" />
                        {form.video_url ? 'URL video non valido' : 'Aggiungi un link YouTube o Vimeo per mostrare la preview.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </FormSection>
          </div>

          <DialogFooter className="border-t px-5 py-4 sm:px-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleSubmit} disabled={upsertMutation.isPending || imageUploadPending}>
              {upsertMutation.isPending ? 'Salvataggio...' : editingId ? 'Salva modifiche' : 'Crea esercizio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma eliminazione</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Sei sicuro di voler eliminare questo esercizio? L'azione non è reversibile.
            </p>
            {usageQuery.data && (usageQuery.data.templates > 0 || usageQuery.data.workouts > 0 || usageQuery.data.favorites > 0) && (
              <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/5 p-3">
                <p className="font-medium text-destructive">⚠️ Esercizio in uso</p>
                <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
                  {usageQuery.data.templates > 0 && (
                    <li>Usato in <strong>{usageQuery.data.templates}</strong> scheda/e</li>
                  )}
                  {usageQuery.data.workouts > 0 && (
                    <li>Usato in <strong>{usageQuery.data.workouts}</strong> allenamento/i assegnato/i</li>
                  )}
                  {usageQuery.data.favorites > 0 && (
                    <li>Salvato come preferito da <strong>{usageQuery.data.favorites}</strong> PT</li>
                  )}
                </ul>
                <p className="pt-1 text-xs text-muted-foreground">
                  Eliminandolo verrà rimosso da preferiti e schede.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Annulla</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExerciseDetailDialog
        exercise={previewExercise}
        open={!!previewExercise}
        onOpenChange={(o) => !o && setPreviewExercise(null)}
      />
    </div>
  );
}
