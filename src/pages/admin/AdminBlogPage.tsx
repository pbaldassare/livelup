import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { DataTable, type Column } from '@/components/dashboard/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { BookOpen, Eye, EyeOff, Trash2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  BLOG_AUTHOR_KIND_LABELS,
  BLOG_POST_STATUS_LABELS,
  BLOG_POST_TYPE_LABELS,
  normalizeBlogPost,
  type BlogPost,
  type BlogPostStatus,
  type BlogPostType,
} from '@/types/database';

type TypeFilter = 'all' | BlogPostType;
type StatusFilter = 'all' | BlogPostStatus;

// blog_posts ha colonne (post_type, status, author_kind, professional_profile_id, hidden_at, hidden_by)
// non ancora presenti in types.ts generato: cast locale finché i tipi non vengono rigenerati.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabase as any;

export function AdminBlogPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);

  const { data: posts = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-blog-posts'],
    queryFn: async () => {
      const { data, error } = await db()
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return ((data || []) as Record<string, unknown>[]).map(normalizeBlogPost);
    },
    retry: 1,
  });

  const authorIds = useMemo(() => Array.from(new Set(posts.map((p) => p.pt_user_id))), [posts]);

  const { data: authorProfiles = {} } = useQuery({
    queryKey: ['admin-blog-author-profiles', authorIds],
    queryFn: async () => {
      if (authorIds.length === 0) return {} as Record<string, { first_name: string | null; last_name: string | null }>;
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', authorIds);
      if (error) throw error;
      const map: Record<string, { first_name: string | null; last_name: string | null }> = {};
      (data || []).forEach((p) => {
        map[p.user_id] = { first_name: p.first_name, last_name: p.last_name };
      });
      return map;
    },
    enabled: authorIds.length > 0,
  });

  const professionalIds = useMemo(
    () => Array.from(new Set(posts.filter((p) => p.professional_profile_id).map((p) => p.professional_profile_id as string))),
    [posts],
  );

  const { data: professionalProfiles = {} } = useQuery({
    queryKey: ['admin-blog-professional-profiles', professionalIds],
    queryFn: async () => {
      if (professionalIds.length === 0) return {} as Record<string, { first_name: string; last_name: string }>;
      const { data, error } = await supabase
        .from('professional_profiles')
        .select('id, first_name, last_name')
        .in('id', professionalIds);
      if (error) throw error;
      const map: Record<string, { first_name: string; last_name: string }> = {};
      (data || []).forEach((p) => {
        map[p.id] = { first_name: p.first_name, last_name: p.last_name };
      });
      return map;
    },
    enabled: professionalIds.length > 0,
  });

  const authorName = (post: BlogPost) => {
    if (post.professional_profile_id && professionalProfiles[post.professional_profile_id]) {
      const pp = professionalProfiles[post.professional_profile_id];
      return `${pp.first_name} ${pp.last_name}`.trim();
    }
    const profile = authorProfiles[post.pt_user_id];
    if (profile) {
      const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
      if (name) return name;
    }
    return 'Sconosciuto';
  };

  const filteredPosts = useMemo(
    () =>
      posts.filter((p) => {
        if (typeFilter !== 'all' && p.post_type !== typeFilter) return false;
        if (statusFilter !== 'all' && p.status !== statusFilter) return false;
        return true;
      }),
    [posts, typeFilter, statusFilter],
  );

  const hideMutation = useMutation({
    mutationFn: async ({ id, hide }: { id: string; hide: boolean }) => {
      const { error } = await db()
        .from('blog_posts')
        .update({ status: hide ? 'hidden' : 'published', hidden_by: hide ? user?.id : null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { hide }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      toast.success(hide ? 'Contenuto nascosto' : 'Contenuto ripubblicato');
    },
    onError: () => toast.error('Errore durante l\'operazione'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().from('blog_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      toast.success('Contenuto eliminato definitivamente');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Errore durante l\'eliminazione'),
  });

  const statusBadgeVariant = (status: BlogPostStatus) =>
    status === 'published' ? 'default' : status === 'hidden' ? 'destructive' : 'secondary';

  const columns: Column<BlogPost>[] = [
    {
      key: 'title',
      header: 'Contenuto',
      cell: (post) => (
        <div className="max-w-sm">
          <p className="font-medium line-clamp-1">{post.post_type === 'qa' ? `D: ${post.title}` : post.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{post.content}</p>
        </div>
      ),
    },
    {
      key: 'post_type',
      header: 'Tipo',
      cell: (post) => (
        <Badge variant="outline">{BLOG_POST_TYPE_LABELS[post.post_type] ?? 'Articolo'}</Badge>
      ),
    },
    {
      key: 'author',
      header: 'Autore',
      cell: (post) => (
        <div className="text-sm">
          <p>{authorName(post)}</p>
          <p className="text-xs text-muted-foreground">
            {BLOG_AUTHOR_KIND_LABELS[post.author_kind] ?? 'Professionista'}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Stato',
      cell: (post) => (
        <Badge variant={statusBadgeVariant(post.status)}>
          {BLOG_POST_STATUS_LABELS[post.status] ?? 'Bozza'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Creato',
      cell: (post) => format(new Date(post.created_at), 'dd MMM yyyy', { locale: it }),
    },
  ];

  return (
    <div className="space-y-6 animate-in">
      <PageHeader title="Blog & Q&A" description="Modera articoli, curiosità e Q&A pubblicati da PT e professionisti" icon={BookOpen} />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
          <TabsList>
            <TabsTrigger value="all">Tutti</TabsTrigger>
            <TabsTrigger value="article">Articoli</TabsTrigger>
            <TabsTrigger value="curiosity">Curiosità</TabsTrigger>
            <TabsTrigger value="qa">Q&amp;A</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="draft">Bozza</SelectItem>
            <SelectItem value="published">Pubblicato</SelectItem>
            <SelectItem value="hidden">Nascosto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p>
            Impossibile caricare i contenuti. Se hai appena aggiunto Blog &amp; Q&amp;A, verifica che lo schema
            sia applicato su Lovable Cloud (<code className="text-xs">scripts/blog-qa-schema.sql</code>).
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Riprova
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredPosts}
        isLoading={isLoading}
        searchKey="title"
        searchPlaceholder="Cerca per titolo..."
        emptyMessage="Nessun contenuto trovato"
        actions={(post) => (
          <div className="flex items-center gap-1">
            {post.status === 'published' && post.slug && (
              <Button variant="ghost" size="sm" asChild title="Visualizza pagina pubblica">
                <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              title={post.status === 'hidden' ? 'Mostra di nuovo' : 'Nascondi'}
              onClick={() => hideMutation.mutate({ id: post.id, hide: post.status !== 'hidden' })}
            >
              {post.status === 'hidden' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteTarget(post)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo contenuto?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" verrà eliminato definitivamente e non potrà essere recuperato. Se vuoi solo
              rimuoverlo dalla vista pubblica senza cancellarlo, usa "Nascondi".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Elimina definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AdminBlogPage;
