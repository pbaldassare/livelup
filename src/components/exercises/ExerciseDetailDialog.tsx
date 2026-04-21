import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Video as VideoIcon, Image as ImageIcon } from 'lucide-react';

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
}

function getYouTubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&?\/\s]+)/
  );
  return match ? match[1] : null;
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

export function ExerciseDetailDialog({ exercise, open, onOpenChange }: ExerciseDetailDialogProps) {
  if (!exercise) return null;
  const youtubeId = exercise.video_url ? getYouTubeVideoId(exercise.video_url) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{exercise.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={difficultyColor(exercise.difficulty_level)}>
              {exercise.difficulty_level.charAt(0).toUpperCase() + exercise.difficulty_level.slice(1)}
            </Badge>
            <Badge variant="secondary">{exercise.category}</Badge>
          </div>

          {/* Muscle groups */}
          {exercise.muscle_groups?.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Gruppi muscolari</p>
              <div className="flex flex-wrap gap-1.5">
                {exercise.muscle_groups.map(mg => (
                  <Badge key={mg} variant="outline" className="text-xs">{mg}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Video */}
          {youtubeId ? (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <VideoIcon className="h-3.5 w-3.5" /> Video dimostrativo
              </p>
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}?modestbranding=1&rel=0`}
                  title={exercise.name}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          ) : exercise.video_url ? (
            <a
              href={exercise.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <VideoIcon className="h-4 w-4" /> Apri video <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}

          {/* Image (if no video) */}
          {!youtubeId && exercise.image_url && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" /> Immagine
              </p>
              <img
                src={exercise.image_url}
                alt={exercise.name}
                className="w-full max-h-80 object-contain rounded-lg border border-border bg-muted"
              />
            </div>
          )}

          {/* Instructions (mandatory) */}
          {exercise.instructions && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Esecuzione</p>
              <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                {exercise.instructions}
              </p>
            </div>
          )}

          {/* Description / tips (optional) */}
          {exercise.description && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Consigli</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
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
