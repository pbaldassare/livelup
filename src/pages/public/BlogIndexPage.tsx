import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  normalizeBlogPost,
  BLOG_POST_TYPE_LABELS,
  type BlogPost,
} from '@/types/database';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { resolveBlogCoverUrl } from '@/lib/blogCover';

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

  const [hero, ...rest] = posts;

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
          <div className="space-y-10">
            {hero && (
              <Link
                to={hero.slug ? `/blog/${hero.slug}` : `/blog/${hero.id}`}
                className="group relative block overflow-hidden rounded-3xl"
              >
                <div className="aspect-[21/9] min-h-[220px] md:aspect-[2.4/1]">
                  <img
                    src={resolveBlogCoverUrl(hero.cover_image_url, hero.id)}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
                  <p className="text-xs font-bold uppercase tracking-wider text-white/80">
                    {BLOG_POST_TYPE_LABELS[hero.post_type]}
                  </p>
                  <h2 className="mt-2 max-w-3xl font-[Space_Grotesk,system-ui,sans-serif] text-2xl font-bold text-white md:text-4xl">
                    {hero.title}
                  </h2>
                  <p className="mt-3 max-w-2xl line-clamp-2 text-sm text-white/75 md:text-base">
                    {excerptFromHtml(hero.content)}
                  </p>
                </div>
              </Link>
            )}

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {(rest.length ? rest : []).map((post: BlogPost) => (
                <Link
                  key={post.id}
                  to={post.slug ? `/blog/${post.slug}` : `/blog/${post.id}`}
                  className="group block"
                >
                  <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-2xl bg-muted">
                    <img
                      src={resolveBlogCoverUrl(post.cover_image_url, post.id)}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                        {BLOG_POST_TYPE_LABELS[post.post_type]}
                      </p>
                      <h2 className="mt-1 font-[Space_Grotesk,system-ui,sans-serif] text-lg font-semibold leading-snug text-white md:text-xl">
                        {post.title}
                      </h2>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                    {excerptFromHtml(post.content)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

export default BlogIndexPage;
