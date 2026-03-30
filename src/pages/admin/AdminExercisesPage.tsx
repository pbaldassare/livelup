import { useState } from 'react';
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, Video, Dumbbell, ExternalLink } from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';

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

export default function AdminExercisesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
        name: values.name,
        description: values.description || null,
        category: values.category,
        muscle_groups: values.muscle_groups,
        difficulty_level: values.difficulty_level as 'principiante' | 'intermedio' | 'avanzato' | 'agonista',
        video_url: values.video_url || null,
        image_url: values.image_url || null,
        instructions: values.instructions || null,
        is_public: true,
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
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast.success(editingId ? 'Esercizio aggiornato' : 'Esercizio creato');
    },
    onError: (err: any) => toast.error(err.message),
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

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error('Il nome è obbligatorio');
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
        title="Libreria Esercizi"
        description="Gestisci gli esercizi disponibili per tutti i Personal Trainer"
      />

      {/* Filters + Add */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca esercizio..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
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

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Esercizi ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Caricamento...</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nessun esercizio trovato</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
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
                        <a
                          href={ex.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                        >
                          <Video className="h-3 w-3" />
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(ex)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(ex.id)}>
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Modifica Esercizio' : 'Nuovo Esercizio'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label>Descrizione</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Livello</Label>
                <Select value={form.difficulty_level} onValueChange={v => setForm(p => ({ ...p, difficulty_level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_LEVELS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Gruppi Muscolari</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {MUSCLE_GROUPS.map(mg => (
                  <Badge
                    key={mg}
                    variant={form.muscle_groups.includes(mg) ? 'default' : 'outline'}
                    className="cursor-pointer select-none"
                    onClick={() => toggleMuscleGroup(mg)}
                  >
                    {mg}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label>Video URL (YouTube)</Label>
              <Input
                value={form.video_url}
                onChange={e => setForm(p => ({ ...p, video_url: e.target.value }))}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
            <div>
              <Label>Immagine URL</Label>
              <Input
                value={form.image_url}
                onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Istruzioni</Label>
              <Textarea
                value={form.instructions}
                onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))}
                rows={3}
                placeholder="Descrivi l'esecuzione corretta..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleSubmit} disabled={upsertMutation.isPending}>
              {editingId ? 'Salva' : 'Crea'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma eliminazione</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Sei sicuro di voler eliminare questo esercizio? L'azione non è reversibile.
          </p>
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
    </div>
  );
}
