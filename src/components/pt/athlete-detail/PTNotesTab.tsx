import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { StickyNote, Plus, Trash2, Lock, Share2, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// =====================================================
// Note PRIVATE del PT sull'atleta.
// RLS: solo il PT autore puo' vedere/modificare.
// =====================================================

const TAGS = [
  { value: 'tecnica', label: 'Tecnica' },
  { value: 'comportamento', label: 'Comportamento' },
  { value: 'infortunio', label: 'Infortunio' },
  { value: 'obiettivo', label: 'Obiettivo' },
  { value: 'generale', label: 'Generale' },
];

interface Props { atletaUserId: string; }

export function PTNotesTab({ atletaUserId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tag, setTag] = useState('generale');

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['pt-athlete-notes', atletaUserId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pt_athlete_notes')
        .select('*')
        .eq('atleta_user_id', atletaUserId)
        .eq('pt_user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const addNote = useMutation({
    mutationFn: async () => {
      if (!body.trim()) throw new Error('Scrivi qualcosa nella nota');
      const { error } = await supabase.from('pt_athlete_notes').insert({
        pt_user_id: user!.id,
        atleta_user_id: atletaUserId,
        title: title.trim() || null,
        body: body.trim(),
        tag,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Nota salvata');
      setTitle(''); setBody(''); setTag('generale');
      qc.invalidateQueries({ queryKey: ['pt-athlete-notes', atletaUserId] });
    },
    onError: (e: any) => toast.error(e?.message || 'Errore'),
  });

  const removeNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pt_athlete_notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Nota eliminata');
      qc.invalidateQueries({ queryKey: ['pt-athlete-notes', atletaUserId] });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Note private — visibili solo a te
          </div>
          <div className="grid md:grid-cols-[1fr_180px] gap-3">
            <Input placeholder="Titolo (opzionale)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Select value={tag} onValueChange={setTag}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TAGS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Textarea rows={4} placeholder="Scrivi una nota sull'atleta…" value={body} onChange={(e) => setBody(e.target.value)} />
          <Button onClick={() => addNote.mutate()} disabled={addNote.isPending || !body.trim()}>
            <Plus className="h-4 w-4 mr-2" /> Aggiungi nota
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Caricamento…</p>
      ) : notes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <StickyNote className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nessuna nota ancora.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((n: any) => (
            <Card key={n.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {n.tag && <Badge variant="outline" className="text-xs capitalize">{n.tag}</Badge>}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(n.created_at), 'dd MMM yyyy · HH:mm', { locale: it })}
                      </span>
                    </div>
                    {n.title && <p className="font-semibold">{n.title}</p>}
                    <p className="text-sm whitespace-pre-wrap text-foreground/90">{n.body}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeNote.mutate(n.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default PTNotesTab;
