import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink, Video as VideoIcon, Image as ImageIcon, Star, Dumbbell } from 'lucide-react';
import { useFavoriteIds, useToggleFavorite } from '@/hooks/usePTFavoriteExercises';
import { cn } from '@/lib/utils';

interface ExerciseLite {
  id: string;
  name: string;
  description: string | null;
  category: string;
  muscle_groups: string[];
  difficulty_level: string;
  video_url: string | null;
  image_url: string | null;
  instructions: string | null;
}

interface ExerciseDetailDialogProps {
  exercise: ExerciseLite | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Mostra il bottone preferito (solo PT). Default false. */
  showFavoriteToggle?: boolean;
}

function getYouTubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&?/\s]+)/
  );
  return match ? match[1] : null;
}

function getVimeoVideoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

function isVideoFileUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    return path.includes('/exercise-videos/') || /\.(mp4|mov|webm)$/.test(path);
  } catch {
    return false;
  }
}

const difficultyColor = (level: string) => {
  switch (level) {
    case 'principiante':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
    case 'intermedio':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
    case 'avanzato':
      return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30';
    default:
      return '';
  }
};

function VideoEmbed({ url, title }: { url: string; title: string }) {
  const youtubeId = getYouTubeVideoId(url);
  const vimeoId = getVimeoVideoId(url);

  if (youtubeId) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?modestbranding=1&rel=0`}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (vimeoId) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}`}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (isVideoFileUrl(url)) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
        <video src={url} title={title} controls className="absolute inset-0 h-full w-full bg-black object-contain" />
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-primary hover:underline"
    >
      <VideoIcon className="h-4 w-4" /> Apri video <ExternalLink className="h-3 w-3" />
    </a>
  );
}

export function ExerciseDetailDialog({
  exercise,
  open,
  onOpenChange,
  showFavoriteToggle = false,
}: ExerciseDetailDialogProps) {
  const { data: favIds } = useFavoriteIds();
  const toggleFav = useToggleFavorite();

  if (!exercise) return null;
  const isFavorite = !!favIds?.has(exercise.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 max-h-[90vh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto p-0">
        <DialogHeader className="border-b px-5 py-5 sm:px-6">
          <DialogTitle className="pr-8 text-2xl font-bold">{exercise.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          {showFavoriteToggle && (
            <Button
              variant={isFavorite ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                toggleFav.mutate({ exerciseId: exercise.id, isFavorite })
              }
              disabled={toggleFav.isPending}
              className="w-full sm:w-auto"
            >
              <Star
                className={cn('mr-2 h-4 w-4', isFavorite && 'fill-current')}
              />
              {isFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
            </Button>
          )}

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={difficultyColor(exercise.difficulty_level)}>
              {exercise.difficulty_level.charAt(0).toUpperCase() + exercise.difficulty_level.slice(1)}
            </Badge>
            <Badge variant="secondary">{exercise.category}</Badge>
            {exercise.video_url && (
              <Badge variant="outline" className="gap-1.5">
                <VideoIcon className="h-3 w-3" /> Video
              </Badge>
            )}
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
              <ImageIcon className="h-3.5 w-3.5" /> Immagine esercizio
            </p>
            <div className="overflow-hidden rounded-xl border bg-muted">
              <div className="flex aspect-[16/9] items-center justify-center">
                {exercise.image_url ? (
                  <img
                    src={exercise.image_url}
                    alt={exercise.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Dumbbell className="h-12 w-12" />
                    <span className="text-sm">Nessuna immagine disponibile</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {exercise.video_url && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                <VideoIcon className="h-3.5 w-3.5" /> Video tutorial
              </p>
              <VideoEmbed url={exercise.video_url} title={exercise.name} />
            </div>
          )}

          {exercise.muscle_groups?.length > 0 && (
            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Gruppi muscolari</p>
              <div className="flex flex-wrap gap-1.5">
                {exercise.muscle_groups.map(mg => (
                  <Badge key={mg} variant="outline" className="text-xs">{mg}</Badge>
                ))}
              </div>
            </div>
          )}

          {exercise.instructions && (
            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Esecuzione</p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                {exercise.instructions}
              </p>
            </div>
          )}

          {exercise.description && (
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Consigli</p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {exercise.description}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ExerciseDetailDialog;
