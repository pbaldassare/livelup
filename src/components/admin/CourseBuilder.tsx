import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Edit, Trash2, Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';

interface CourseBuilderProps {
  courseId: string;
  onBack: () => void;
}

export function CourseBuilder({ courseId, onBack }: CourseBuilderProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [form, setForm] = useState({ title: '', description: '', duration_minutes: '8', video_url: '', content: '' });

  const { data: course } = useQuery({
    queryKey: ['course-detail', courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('*').eq('id', courseId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['course-sessions', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_sessions')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        description: form.description || null,
        duration_minutes: parseInt(form.duration_minutes) || null,
        video_url: form.video_url || null,
        content: form.content || null,
      };

      if (editingSession) {
        const { error } = await supabase.from('course_sessions').update(payload).eq('id', editingSession.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('course_sessions').insert({
          ...payload,
          course_id: courseId,
          order_index: sessions.length,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-sessions', courseId] });
      toast.success(editingSession ? 'Sessione aggiornata' : 'Sessione aggiunta');
      closeDialog();
    },
    onError: () => toast.error('Errore nel salvataggio'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('course_sessions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-sessions', courseId] });
      toast.success('Sessione eliminata');
    },
  });

  const openEdit = (session: any) => {
    setEditingSession(session);
    setForm({
      title: session.title, description: session.description || '',
      duration_minutes: String(session.duration_minutes || 8), video_url: session.video_url || '',
      content: session.content || '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingSession(null);
    setForm({ title: '', description: '', duration_minutes: '8', video_url: '', content: '' });
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" />Indietro</Button>
        <div>
          <h1 className="text-xl font-bold">{course?.title || 'Corso'}</h1>
          <p className="text-sm text-muted-foreground">Gestisci le sessioni del corso</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => { setEditingSession(null); setForm({ title: '', description: '', duration_minutes: '8', video_url: '', content: '' }); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Aggiungi Sessione
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : sessions.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-muted-foreground">Nessuna sessione. Aggiungi la prima!</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session, index) => (
            <Card key={session.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-bold text-lg w-8 tabular-nums">{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium">{session.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">{session.description || 'Nessuna descrizione'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {session.video_url && <Play className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-sm text-muted-foreground">{session.duration_minutes || '?'} min</span>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(session)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteMutation.mutate(session.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg w-[calc(100%-2rem)] max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingSession ? 'Modifica Sessione' : 'Nuova Sessione'}</DialogTitle>
            <DialogDescription>Configura i dettagli della sessione</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
            <div className="space-y-1.5">
              <Label>Titolo *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Es: Addominali bassi" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrizione</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descrivi la sessione..." className="min-h-[60px]" />
            </div>
            <div className="space-y-1.5">
              <Label>Durata (min)</Label>
              <Input type="number" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Video URL</Label>
              <Input value={form.video_url} onChange={e => setForm(p => ({ ...p, video_url: e.target.value }))} placeholder="https://youtube.com/watch?v=..." />
            </div>
            <div className="space-y-1.5">
              <Label>Contenuto / Istruzioni</Label>
              <Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Istruzioni dettagliate..." className="min-h-[100px]" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={closeDialog}>Annulla</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.title || saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvataggio...' : editingSession ? 'Aggiorna' : 'Aggiungi'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CourseBuilder;
