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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Plus, Edit, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

export function PTBlogPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [form, setForm] = useState({ title: '', content: '', tags: '', cover_image_url: '' });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['pt-blog-posts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('pt_user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      
      if (editingPost) {
        const { error } = await supabase
          .from('blog_posts')
          .update({ title: form.title, content: form.content, slug, tags, cover_image_url: form.cover_image_url || null, updated_at: new Date().toISOString() })
          .eq('id', editingPost.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('blog_posts')
          .insert({ pt_user_id: user.id, title: form.title, content: form.content, slug, tags, cover_image_url: form.cover_image_url || null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-blog-posts'] });
      toast.success(editingPost ? 'Articolo aggiornato' : 'Articolo creato');
      closeDialog();
    },
    onError: () => toast.error('Errore nel salvataggio'),
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase
        .from('blog_posts')
        .update({ 
          is_published, 
          published_at: is_published ? new Date().toISOString() : null,
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-blog-posts'] });
      toast.success('Stato aggiornato');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-blog-posts'] });
      toast.success('Articolo eliminato');
    },
  });

  const openEdit = (post: any) => {
    setEditingPost(post);
    setForm({ title: post.title, content: post.content, tags: (post.tags || []).join(', '), cover_image_url: post.cover_image_url || '' });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingPost(null);
    setForm({ title: '', content: '', tags: '', cover_image_url: '' });
  };

  return (
    <div className="space-y-6 animate-in">
      {!embedded && (
        <PageHeader
          title="Blog"
          description="Crea e gestisci i tuoi articoli"
          icon={BookOpen}
          actions={
            <Button onClick={() => { setEditingPost(null); setForm({ title: '', content: '', tags: '', cover_image_url: '' }); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Articolo
            </Button>
          }
        />
      )}
      {embedded && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { setEditingPost(null); setForm({ title: '', content: '', tags: '', cover_image_url: '' }); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Nuovo
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nessun articolo</h3>
            <p className="text-muted-foreground mb-4">Scrivi il tuo primo articolo per condividere conoscenze con i tuoi atleti</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crea Articolo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.map(post => (
            <Card key={post.id} className="flex flex-col">
              {post.cover_image_url && (
                <div className="aspect-video overflow-hidden rounded-t-lg">
                  <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover" />
                </div>
              )}
              <CardHeader className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base line-clamp-2">{post.title}</CardTitle>
                  <Badge variant={post.is_published ? 'default' : 'secondary'} className="shrink-0">
                    {post.is_published ? 'Pubblicato' : 'Bozza'}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">{post.content.substring(0, 120)}...</CardDescription>
                {post.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {post.tags.map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <Separator className="mb-3" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(post.created_at), 'dd MMM yyyy', { locale: it })}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => togglePublishMutation.mutate({ id: post.id, is_published: !post.is_published })}>
                      {post.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(post)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteMutation.mutate(post.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-2xl w-[calc(100%-2rem)] max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingPost ? 'Modifica Articolo' : 'Nuovo Articolo'}</DialogTitle>
            <DialogDescription>Scrivi un articolo per condividere con i tuoi atleti</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
            <div className="space-y-1.5">
              <Label>Titolo *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Titolo dell'articolo" />
            </div>
            <div className="space-y-1.5">
              <Label>Contenuto *</Label>
              <Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Scrivi il tuo articolo..." className="min-h-[200px]" />
            </div>
            <div className="space-y-1.5">
              <Label>Immagine copertina (URL)</Label>
              <Input value={form.cover_image_url} onChange={e => setForm(p => ({ ...p, cover_image_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label>Tag (separati da virgola)</Label>
              <Input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="fitness, nutrizione, motivazione" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={closeDialog}>Annulla</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.title || !form.content || saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvataggio...' : editingPost ? 'Aggiorna' : 'Crea'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PTBlogPage;
