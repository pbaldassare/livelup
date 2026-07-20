import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Plus, Edit, Trash2, Eye, EyeOff, Loader2, Lock, HelpCircle, Sparkles, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  BLOG_AUTHOR_KIND_LABELS,
  BLOG_POST_STATUS_LABELS,
  BLOG_POST_TYPE_LABELS,
  normalizeBlogPost,
  type BlogAuthorKind,
  type BlogPost,
  type BlogPostType,
} from '@/types/database';

const TYPE_ICONS: Record<BlogPostType, typeof FileText> = {
  article: FileText,
  curiosity: Sparkles,
  qa: HelpCircle,
};

function isMissingBlogSchemaError(error: { message?: string; code?: string } | null): boolean {
  if (!error?.message) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('post_type') ||
    msg.includes('author_kind') ||
    msg.includes('professional_profile_id') ||
    (msg.includes('column') && msg.includes('status')) ||
    msg.includes('schema cache')
  );
}

type TabValue = 'all' | BlogPostType;

const EMPTY_FORM = { title: '', content: '', tags: '', cover_image_url: '', post_type: 'article' as BlogPostType };

// blog_posts ha colonne (post_type, status, author_kind, professional_profile_id, hidden_at, hidden_by)
// non ancora presenti in types.ts generato: cast locale finché i tipi non vengono rigenerati.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabase as any;

export function PTBlogPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { user } = useAuth();
  const { isPT, isAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [form, setForm] = useState(EMPTY_FORM);

  // Determina il "ruolo autore" per chi non è PT né admin (es. professionista con account collegato a professional_profiles)
  const { data: authorContext } = useQuery({
    queryKey: ['blog-author-context', user?.id, isPT, isAdmin],
    queryFn: async () => {
      if (!user?.id) return null;
      if (isPT) return { authorKind: 'pt' as BlogAuthorKind, professionalProfileId: null as string | null };
      if (isAdmin) return { authorKind: 'admin' as BlogAuthorKind, professionalProfileId: null as string | null };
      const { data } = await supabase
        .from('professional_profiles')
        .select('id, profession_type')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        return {
          authorKind: data.profession_type as BlogAuthorKind,
          professionalProfileId: data.id as string,
        };
      }
      return { authorKind: 'pt' as BlogAuthorKind, professionalProfileId: null as string | null };
    },
    enabled: !!user?.id,
  });

  const { data: posts = [], isLoading, isError, error: postsError, refetch } = useQuery({
    queryKey: ['pt-blog-posts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await db()
        .from('blog_posts')
        .select('*')
        .eq('pt_user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return ((data || []) as Record<string, unknown>[]).map(normalizeBlogPost);
    },
    enabled: !!user?.id,
    retry: 1,
  });

  const schemaMissing = isError && isMissingBlogSchemaError(postsError as { message?: string } | null);

  const filteredPosts = useMemo(
    () => (activeTab === 'all' ? posts : posts.filter((p) => p.post_type === activeTab)),
    [posts, activeTab],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      const slugBase = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const slug = editingPost?.slug || `${slugBase}-${Date.now().toString(36)}`;
      const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);

      if (editingPost) {
        const { error } = await db()
          .from('blog_posts')
          .update({
            title: form.title,
            content: form.content,
            post_type: form.post_type,
            tags,
            cover_image_url: form.cover_image_url || null,
          })
          .eq('id', editingPost.id);
        if (error) throw error;
      } else {
        const { error } = await db().from('blog_posts').insert({
          pt_user_id: user.id,
          title: form.title,
          content: form.content,
          post_type: form.post_type,
          status: 'draft',
          author_kind: authorContext?.authorKind || 'pt',
          professional_profile_id: authorContext?.professionalProfileId || null,
          slug,
          tags,
          cover_image_url: form.cover_image_url || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-blog-posts'] });
      toast.success(editingPost ? 'Contenuto aggiornato' : 'Contenuto creato');
      closeDialog();
    },
    onError: (err) => {
      toast.error(
        isMissingBlogSchemaError(err as { message?: string })
          ? 'Schema Blog & Q&A non applicato sul backend. Applica scripts/blog-qa-schema.sql su Lovable Cloud.'
          : 'Errore nel salvataggio',
      );
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }) => {
      const { error } = await db()
        .from('blog_posts')
        .update({ status: publish ? 'published' : 'draft' })
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
      const { error } = await db().from('blog_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-blog-posts'] });
      toast.success('Contenuto eliminato');
    },
  });

  const openEdit = (post: BlogPost) => {
    setEditingPost(post);
    setForm({
      title: post.title,
      content: post.content,
      tags: (post.tags || []).join(', '),
      cover_image_url: post.cover_image_url || '',
      post_type: post.post_type,
    });
    setDialogOpen(true);
  };

  const openNew = (postType?: BlogPostType) => {
    setEditingPost(null);
    setForm({ ...EMPTY_FORM, post_type: postType || (activeTab === 'all' ? 'article' : activeTab) });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingPost(null);
    setForm(EMPTY_FORM);
  };

  const isQA = form.post_type === 'qa';

  const statusBadgeVariant = (status: BlogPost['status']) =>
    status === 'published' ? 'default' : status === 'hidden' ? 'destructive' : 'secondary';

  const newButton = (
    <Button size={embedded ? 'sm' : 'default'} onClick={() => openNew()}>
      <Plus className="h-4 w-4 mr-1" /> Nuovo
    </Button>
  );

  return (
    <div className="space-y-6 animate-in">
      {!embedded && (
        <PageHeader
          title="Blog & Q&A"
          description="Condividi articoli, curiosità e rispondi alle domande dei tuoi atleti"
          icon={BookOpen}
          actions={newButton}
        />
      )}
      {embedded && <div className="flex justify-end">{newButton}</div>}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="w-full sm:w-auto flex-wrap">
          <TabsTrigger value="all">Tutti</TabsTrigger>
          <TabsTrigger value="article">Articoli</TabsTrigger>
          <TabsTrigger value="curiosity">Curiosità</TabsTrigger>
          <TabsTrigger value="qa">Q&amp;A</TabsTrigger>
        </TabsList>
      </Tabs>

      {isError ? (
        <Card>
          <CardContent className="text-center py-12 space-y-3">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-semibold">Impossibile caricare i contenuti</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              {schemaMissing
                ? 'Lo schema Blog & Q&A non risulta ancora applicato sul backend. Applica la migration blog_qa_schema (o lo script scripts/blog-qa-schema.sql) su Lovable Cloud, poi riprova.'
                : 'Si è verificato un errore durante il caricamento. Riprova tra poco.'}
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Riprova
            </Button>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nessun contenuto</h3>
            <p className="text-muted-foreground mb-4">
              Crea un articolo, una curiosità o rispondi a una domanda per i tuoi atleti
            </p>
            <Button onClick={() => openNew()}>
              <Plus className="h-4 w-4 mr-2" />
              Crea contenuto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((post) => {
            const TypeIcon = TYPE_ICONS[post.post_type] ?? FileText;
            const isHiddenByAdmin = post.status === 'hidden';
            const excerpt = post.content ? `${post.content.slice(0, 120)}${post.content.length > 120 ? '...' : ''}` : '';
            return (
              <Card key={post.id} className="flex flex-col">
                {post.cover_image_url && (
                  <div className="aspect-video overflow-hidden rounded-t-lg">
                    <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardHeader className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <TypeIcon className="h-3.5 w-3.5" />
                      {BLOG_POST_TYPE_LABELS[post.post_type] ?? 'Articolo'}
                    </div>
                    <Badge variant={statusBadgeVariant(post.status)} className="shrink-0">
                      {BLOG_POST_STATUS_LABELS[post.status] ?? 'Bozza'}
                    </Badge>
                  </div>
                  <CardTitle className="text-base line-clamp-2">
                    {post.post_type === 'qa' ? `D: ${post.title}` : post.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {post.post_type === 'qa' ? `R: ${post.content}` : excerpt}
                  </CardDescription>
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {post.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {isHiddenByAdmin && (
                    <div className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                      <Lock className="h-3.5 w-3.5" />
                      Nascosto dall'amministratore
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
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isHiddenByAdmin}
                        title={isHiddenByAdmin ? "Nascosto dall'amministratore" : undefined}
                        onClick={() =>
                          togglePublishMutation.mutate({ id: post.id, publish: post.status !== 'published' })
                        }
                      >
                        {post.status === 'published' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(post)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate(post.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-2xl w-[calc(100%-2rem)] max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingPost ? 'Modifica contenuto' : 'Nuovo contenuto'}</DialogTitle>
            <DialogDescription>
              {authorContext?.authorKind
                ? `Pubblichi come ${BLOG_AUTHOR_KIND_LABELS[authorContext.authorKind] ?? 'Professionista'}`
                : 'Scrivi un contenuto per i tuoi atleti'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
            <div className="space-y-1.5">
              <Label>Tipo di contenuto *</Label>
              <Select
                value={form.post_type}
                onValueChange={(v) => setForm((p) => ({ ...p, post_type: v as BlogPostType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="article">Articolo</SelectItem>
                  <SelectItem value="curiosity">Curiosità</SelectItem>
                  <SelectItem value="qa">Domanda e Risposta (Q&amp;A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isQA ? 'Domanda *' : 'Titolo *'}</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder={isQA ? 'Es: Quante volte a settimana devo allenarmi?' : 'Titolo del contenuto'}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{isQA ? 'Risposta *' : 'Contenuto *'}</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                placeholder={isQA ? 'Scrivi la risposta...' : 'Scrivi il tuo contenuto...'}
                className="min-h-[200px]"
              />
            </div>
            {!isQA && (
              <div className="space-y-1.5">
                <Label>Immagine copertina (URL)</Label>
                <Input
                  value={form.cover_image_url}
                  onChange={(e) => setForm((p) => ({ ...p, cover_image_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Tag (separati da virgola)</Label>
              <Input
                value={form.tags}
                onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                placeholder="fitness, nutrizione, motivazione"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={closeDialog}>
              Annulla
            </Button>
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
