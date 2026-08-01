import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Dumbbell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  normalizeBlogPost,
  BLOG_POST_TYPE_LABELS,
  type BlogPost,
} from '@/types/database';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { PublicLayout } from '@/components/layouts/PublicLayout';

function excerptFromHtml(html: string, max = 160): string {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

export function BlogIndexPage() {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['public-blog-index'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(24);
      if (error) throw error;
      return ((data || []) as Record<string, unknown>[]).map(normalizeBlogPost);
    },
  });

  return (
    <PublicLayout>
      <div className="container-wide py-12 md:py-16">
        <div className="mb-10 max-w-2xl">
          <h1 className="font-[Space_Grotesk,system-ui,sans-serif] text-3xl font-bold md:text-4xl">
            Blog
          </h1>
          <p className="mt-2 text-muted-foreground">
            Articoli, curiosità e Q&amp;A dalla community Livelapp.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center text-muted-foreground">
            Nessun articolo pubblicato al momento.
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post: BlogPost) => (
              <Link
                key={post.id}
                to={post.slug ? `/blog/${post.slug}` : `/blog/${post.id}`}
                className="group block"
              >
                <div className="mb-4 aspect-[16/10] overflow-hidden rounded-2xl bg-muted">
                  {post.cover_image_url ? (
                    <img
                      src={post.cover_image_url}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-primary/30">
                      <Dumbbell className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  {BLOG_POST_TYPE_LABELS[post.post_type]}
                </p>
                <h2 className="mt-2 text-xl font-semibold leading-snug group-hover:text-primary">
                  {post.title}
                </h2>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                  {excerptFromHtml(post.content)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

export default BlogIndexPage;
