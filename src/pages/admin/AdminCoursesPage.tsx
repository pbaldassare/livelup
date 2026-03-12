import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { CourseBuilder } from '@/components/admin/CourseBuilder';
import { GraduationCap, Plus, Edit, Trash2, Eye, Settings, Loader2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export function AdminCoursesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [builderCourseId, setBuilderCourseId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', cover_image_url: '', price: '0',
    is_free: true, difficulty_level: 'principiante', duration_minutes: '30', category: '',
  });

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        description: form.description || null,
        cover_image_url: form.cover_image_url || null,
        price: form.is_free ? 0 : parseFloat(form.price) || 0,
        is_free: form.is_free,
        difficulty_level: form.difficulty_level,
        duration_minutes: parseInt(form.duration_minutes) || null,
        category: form.category || null,
      };

      if (editingCourse) {
        const { error } = await supabase.from('courses').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingCourse.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('courses').insert({ ...payload, created_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      toast.success(editingCourse ? 'Corso aggiornato' : 'Corso creato');
      closeDialog();
    },
    onError: () => toast.error('Errore nel salvataggio'),
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase.from('courses').update({ is_published, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      toast.success('Stato aggiornato');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      toast.success('Corso eliminato');
    },
  });

  const openEdit = (course: any) => {
    setEditingCourse(course);
    setForm({
      title: course.title, description: course.description || '', cover_image_url: course.cover_image_url || '',
      price: String(course.price || 0), is_free: course.is_free, difficulty_level: course.difficulty_level || 'principiante',
      duration_minutes: String(course.duration_minutes || 30), category: course.category || '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCourse(null);
    setForm({ title: '', description: '', cover_image_url: '', price: '0', is_free: true, difficulty_level: 'principiante', duration_minutes: '30', category: '' });
  };

  if (builderCourseId) {
    return <CourseBuilder courseId={builderCourseId} onBack={() => setBuilderCourseId(null)} />;
  }

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title="Corsi"
        description="Gestisci i percorsi formativi della piattaforma"
        icon={GraduationCap}
        actions={
          <Button onClick={() => { setEditingCourse(null); closeDialog(); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Corso
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : courses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nessun corso</h3>
            <p className="text-muted-foreground mb-4">Crea il primo percorso formativo</p>
            <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Crea Corso</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map(course => (
            <Card key={course.id} className="flex flex-col">
              {course.cover_image_url && (
                <div className="aspect-video overflow-hidden rounded-t-lg">
                  <img src={course.cover_image_url} alt={course.title} className="w-full h-full object-cover" />
                </div>
              )}
              <CardHeader className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{course.title}</CardTitle>
                  <div className="flex gap-1 shrink-0">
                    <Badge variant={course.is_published ? 'default' : 'secondary'}>{course.is_published ? 'Pubblicato' : 'Bozza'}</Badge>
                    <Badge variant="outline">{course.is_free ? 'Gratuito' : `€${course.price}`}</Badge>
                  </div>
                </div>
                <CardDescription className="line-clamp-2">{course.description || 'Nessuna descrizione'}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Separator className="mb-3" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground capitalize">{course.difficulty_level} · {course.duration_minutes || '?'} min</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setBuilderCourseId(course.id)} title="Gestisci sessioni">
                      <BookOpen className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => togglePublishMutation.mutate({ id: course.id, is_published: !course.is_published })}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(course)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteMutation.mutate(course.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg w-[calc(100%-2rem)] max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingCourse ? 'Modifica Corso' : 'Nuovo Corso'}</DialogTitle>
            <DialogDescription>Configura i dettagli del percorso formativo</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
            <div className="space-y-1.5">
              <Label>Titolo *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Es: Addominali d'acciaio in 8 minuti" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrizione</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descrivi il corso..." className="min-h-[80px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Difficoltà</Label>
                <Select value={form.difficulty_level} onValueChange={v => setForm(p => ({ ...p, difficulty_level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="principiante">Principiante</SelectItem>
                    <SelectItem value="intermedio">Intermedio</SelectItem>
                    <SelectItem value="avanzato">Avanzato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Durata (min)</Label>
                <Input type="number" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="Es: Fitness, Benessere, Martial Arts" />
            </div>
            <div className="space-y-1.5">
              <Label>Copertina (URL)</Label>
              <Input value={form.cover_image_url} onChange={e => setForm(p => ({ ...p, cover_image_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="flex items-center justify-between">
              <Label>Corso gratuito</Label>
              <Switch checked={form.is_free} onCheckedChange={v => setForm(p => ({ ...p, is_free: v }))} />
            </div>
            {!form.is_free && (
              <div className="space-y-1.5">
                <Label>Prezzo (€)</Label>
                <Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={closeDialog}>Annulla</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.title || saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvataggio...' : editingCourse ? 'Aggiorna' : 'Crea'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminCoursesPage;
