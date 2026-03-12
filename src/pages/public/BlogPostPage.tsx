import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageLoader } from '@/components/common/PageLoader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();
      if (error) throw error;

      // Fetch author profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('user_id', data.pt_user_id)
        .single();

      return { ...data, author: profile };
    },
    enabled: !!slug,
  });

  if (isLoading) return <PageLoader text="Caricamento articolo..." />;

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-bold mb-2">Articolo non trovato</h1>
        <Link to="/"><Button variant="link">Torna alla home</Button></Link>
      </div>
    );
  }

  const authorName = `${post.author?.first_name || ''} ${post.author?.last_name || ''}`.trim() || 'Personal Trainer';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Torna indietro
        </Link>

        {post.cover_image_url && (
          <div className="aspect-video rounded-xl overflow-hidden mb-6">
            <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover" />
          </div>
        )}

        <h1 className="text-3xl font-bold mb-4">{post.title}</h1>

        <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={post.author?.avatar_url || undefined} />
              <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
            </Avatar>
            <span>{authorName}</span>
          </div>
          {post.published_at && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(new Date(post.published_at), 'dd MMMM yyyy', { locale: it })}
            </div>
          )}
        </div>

        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {post.tags.map((tag: string) => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        )}

        <div className="prose prose-lg max-w-none whitespace-pre-wrap">{post.content}</div>
      </div>
    </div>
  );
}

export default BlogPostPage;
