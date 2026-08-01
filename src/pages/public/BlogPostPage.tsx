import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageLoader } from '@/components/common/PageLoader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { resolveBlogCoverUrl } from '@/lib/blogCover';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  BLOG_AUTHOR_KIND_LABELS,
  BLOG_POST_TYPE_LABELS,
  normalizeBlogPost,
} from '@/types/database';

// blog_posts ha colonne (post_type, status, author_kind, professional_profile_id)
// non ancora presenti in types.ts generato: cast locale finché i tipi non vengono rigenerati.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabase as any;

function isMissingStatusColumn(error: { message?: string } | null): boolean {
  const msg = (error?.message || '').toLowerCase();
  return msg.includes('status') && (msg.includes('column') || msg.includes('schema cache'));
}

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      let data: Record<string, unknown> | null = null;
      let error: { message?: string } | null = null;

      const byStatus = await db()
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();

      if (byStatus.error && isMissingStatusColumn(byStatus.error)) {
        // Pre-migration: filtra con is_published legacy
        const legacy = await db()
          .from('blog_posts')
          .select('*')
          .eq('slug', slug)
          .eq('is_published', true)
          .maybeSingle();
        data = legacy.data;
        error = legacy.error;
      } else {
        data = byStatus.data;
        error = byStatus.error;
      }

      if (error) throw error;
      if (!data) return null;

      const row = normalizeBlogPost(data);

      let author: { name: string; avatar_url: string | null } | null = null;

      if (row.professional_profile_id) {
        const { data: professional } = await supabase
          .from('professional_profiles')
          .select('first_name, last_name, avatar_url')
          .eq('id', row.professional_profile_id)
          .maybeSingle();
        if (professional) {
          author = {
            name: `${professional.first_name || ''} ${professional.last_name || ''}`.trim(),
            avatar_url: professional.avatar_url,
          };
        }
      }

      if (!author) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url')
          .eq('user_id', row.pt_user_id)
          .maybeSingle();
        if (profile) {
          author = {
            name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
            avatar_url: profile.avatar_url,
          };
        }
      }

      return { ...row, author };
    },
    enabled: !!slug,
  });

  if (isLoading) return <PageLoader text="Caricamento contenuto..." />;

  if (!post) {
    return (
      <PublicLayout>
        <div className="flex flex-col items-center justify-center px-6 py-24">
          <h1 className="mb-2 text-2xl font-bold">Contenuto non trovato</h1>
          <Link to="/blog">
            <Button variant="link">Torna al blog</Button>
          </Link>
        </div>
      </PublicLayout>
    );
  }

  const authorName = post.author?.name || BLOG_AUTHOR_KIND_LABELS[post.author_kind] || 'Personal Trainer';
  const isQA = post.post_type === 'qa';
  const cover = resolveBlogCoverUrl(post.cover_image_url, post.id);

  return (
    <PublicLayout>
      <div className="relative">
        <div className="relative aspect-[21/9] min-h-[240px] w-full overflow-hidden md:aspect-[2.6/1]">
          <img src={cover} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-black/30" />
          <div className="absolute inset-x-0 bottom-0">
            <div className="mx-auto max-w-3xl px-4 pb-8 pt-16 md:pb-10">
              <Link
                to="/blog"
                className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Torna al blog
              </Link>
              <Badge variant="secondary" className="mb-3">
                {BLOG_POST_TYPE_LABELS[post.post_type] ?? 'Articolo'}
              </Badge>
              <h1 className="font-[Space_Grotesk,system-ui,sans-serif] text-3xl font-bold md:text-5xl">
                {isQA ? `D: ${post.title}` : post.title}
              </h1>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={post.author?.avatar_url || undefined} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <span>
                {authorName}
                <span className="text-xs text-muted-foreground/80">
                  {' '}
                  · {BLOG_AUTHOR_KIND_LABELS[post.author_kind] ?? 'Professionista'}
                </span>
              </span>
            </div>
            {post.published_at && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(post.published_at), 'dd MMMM yyyy', { locale: it })}
              </div>
            )}
          </div>

          {post.tags && post.tags.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-1.5">
              {post.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {isQA && <p className="mb-2 text-sm font-semibold text-muted-foreground">Risposta</p>}
          <div className="prose prose-lg max-w-none whitespace-pre-wrap">{post.content}</div>
        </div>
      </div>
    </PublicLayout>
  );
}

export default BlogPostPage;
