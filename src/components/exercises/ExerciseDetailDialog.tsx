import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ExternalLink,
  Video as VideoIcon,
  Image as ImageIcon,
  Star,
  Dumbbell,
  Clipboard,
  CheckCircle2,
  Target,
  Lightbulb,
  ListChecks,
  Layers3,
  PlayCircle,
  Info,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
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

const formatValue = (value?: string | null) => {
  if (!value) return 'Non definito';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

function VideoEmbed({ url, title, elevated = false }: { url: string; title: string; elevated?: boolean }) {
  const youtubeId = getYouTubeVideoId(url);
  const vimeoId = getVimeoVideoId(url);
  const frameClass = cn(
    'relative aspect-video w-full overflow-hidden rounded-2xl border bg-muted shadow-sm',
    elevated && 'shadow-lg shadow-primary/10'
  );

  if (youtubeId) {
    return (
      <div className={frameClass}>
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
      <div className={frameClass}>
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
      <div className={frameClass}>
        <video src={url} title={title} controls className="absolute inset-0 h-full w-full bg-muted object-contain" />
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border bg-muted/40 p-5 text-sm font-medium text-primary transition-colors hover:bg-muted hover:underline"
    >
      <VideoIcon className="h-4 w-4" /> Apri video tutorial <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-2xl border bg-card p-5 shadow-sm', className)}>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function QuickStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border bg-muted/35 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <p className="truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
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
  const hasImage = !!exercise.image_url;
  const hasVideo = !!exercise.video_url;
  const focusMuscles = exercise.muscle_groups?.slice(0, 3) ?? [];
  const mainFocus = focusMuscles.length > 0 ? focusMuscles.join(', ') : 'Non definito';

  const handleCopyName = async () => {
    try {
      await navigator.clipboard.writeText(exercise.name);
      toast.success('Nome esercizio copiato');
    } catch {
      toast.error('Impossibile copiare il nome');
    }
  };

  const imagePanel = (
    <div className="relative overflow-hidden rounded-2xl border bg-muted shadow-lg shadow-primary/10">
      <div className="flex aspect-[16/9] items-center justify-center">
        {hasImage ? (
          <img src={exercise.image_url!} alt={exercise.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-muted via-muted/70 to-primary/10 p-8 text-center text-muted-foreground">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border bg-background/70 shadow-sm">
              <Dumbbell className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Media non ancora disponibile</p>
              <p className="mt-1 max-w-sm text-sm">L’esercizio resta pronto per schede e allenamenti anche senza immagine o tutorial.</p>
            </div>
          </div>
        )}
      </div>
      {hasVideo && !hasImage && (
        <div className="absolute bottom-3 left-3 rounded-full border bg-background/90 px-3 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur">
          Tutorial video disponibile
        </div>
      )}
    </div>
  );

  const mediaBlock = hasImage && hasVideo ? (
    <Tabs defaultValue="image" className="w-full">
      <TabsList className="mb-3 grid h-11 w-full grid-cols-2 rounded-2xl bg-muted/70 p-1">
        <TabsTrigger value="image" className="gap-2 rounded-xl">
          <ImageIcon className="h-4 w-4" /> Immagine
        </TabsTrigger>
        <TabsTrigger value="video" className="gap-2 rounded-xl">
          <PlayCircle className="h-4 w-4" /> Video
        </TabsTrigger>
      </TabsList>
      <TabsContent value="image" className="mt-0">{imagePanel}</TabsContent>
      <TabsContent value="video" className="mt-0"><VideoEmbed url={exercise.video_url!} title={exercise.name} elevated /></TabsContent>
    </Tabs>
  ) : hasVideo ? (
    <VideoEmbed url={exercise.video_url!} title={exercise.name} elevated />
  ) : (
    imagePanel
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 max-h-[92vh] w-[calc(100vw-1rem)] max-w-5xl overflow-hidden rounded-3xl border bg-background p-0 shadow-2xl sm:w-[calc(100vw-2rem)]">
        <DialogHeader className="sticky top-0 z-20 border-b bg-background/95 px-5 py-4 backdrop-blur sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full">Exercise library</Badge>
                <Badge variant="outline" className={cn('rounded-full', difficultyColor(exercise.difficulty_level))}>
                  {formatValue(exercise.difficulty_level)}
                </Badge>
                <Badge variant="outline" className="rounded-full">{exercise.category}</Badge>
                {focusMuscles.map(muscle => (
                  <Badge key={muscle} variant="outline" className="rounded-full bg-primary/5 text-xs">
                    {muscle}
                  </Badge>
                ))}
              </div>
              <DialogTitle className="pr-8 text-2xl font-bold leading-tight tracking-normal sm:text-3xl">
                {exercise.name}
              </DialogTitle>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:pt-1">
              {showFavoriteToggle && (
                <Button
                  variant={isFavorite ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleFav.mutate({ exerciseId: exercise.id, isFavorite })}
                  disabled={toggleFav.isPending}
                  className="rounded-full"
                >
                  <Star className={cn('mr-2 h-4 w-4', isFavorite && 'fill-current')} />
                  {isFavorite ? 'Salvato nei preferiti' : 'Aggiungi ai preferiti'}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleCopyName} className="rounded-full">
                <Clipboard className="mr-2 h-4 w-4" /> Copia nome
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(92vh-112px)] overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <div className="space-y-6">
              <div>
                <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" /> Media esercizio
                </p>
                {mediaBlock}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <QuickStat icon={Target} label="Difficoltà" value={formatValue(exercise.difficulty_level)} />
                <QuickStat icon={Layers3} label="Categoria" value={exercise.category || 'Non definita'} />
                <QuickStat icon={Dumbbell} label="Focus" value={mainFocus} />
                <QuickStat icon={VideoIcon} label="Tutorial" value={hasVideo ? 'Presente' : 'Assente'} />
                <QuickStat icon={ImageIcon} label="Immagine" value={hasImage ? 'Presente' : 'Assente'} />
              </div>

              <SectionCard icon={ListChecks} title="Tecnica esecuzione">
                {exercise.instructions ? (
                  <p className="whitespace-pre-line text-sm leading-7 text-foreground">{exercise.instructions}</p>
                ) : (
                  <p className="text-sm leading-7 text-muted-foreground">Tecnica non ancora compilata dall’Admin.</p>
                )}
              </SectionCard>

              <SectionCard icon={Lightbulb} title="Consigli del coach">
                {exercise.description ? (
                  <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">{exercise.description}</p>
                ) : (
                  <p className="text-sm leading-7 text-muted-foreground">Nessun consiglio aggiuntivo disponibile per questo esercizio.</p>
                )}
              </SectionCard>
            </div>

            <aside className="space-y-4">
              <SectionCard icon={Dumbbell} title="Muscoli coinvolti">
                {exercise.muscle_groups?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {exercise.muscle_groups.map(mg => (
                      <Badge key={mg} variant="outline" className="rounded-full bg-muted/50 px-3 py-1 text-xs">
                        {mg}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Gruppi muscolari non specificati.</p>
                )}
              </SectionCard>

              {hasVideo && (
                <SectionCard icon={VideoIcon} title="Media / Tutorial" className="xl:hidden">
                  <VideoEmbed url={exercise.video_url!} title={exercise.name} />
                </SectionCard>
              )}

              <SectionCard icon={CheckCircle2} title="Uso nelle schede" className="bg-primary/5">
                <p className="text-sm leading-6 text-muted-foreground">
                  Disponibile per essere aggiunto alle tue schede e ai template di allenamento.
                </p>
              </SectionCard>

              <SectionCard icon={Info} title="Note extra">
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2">
                    <span>Sorgente dati</span>
                    <span className="font-medium text-foreground">Archivio Admin</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2">
                    <span>Video tutorial</span>
                    <span className="font-medium text-foreground">{hasVideo ? 'Collegato' : 'Non presente'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2">
                    <span>Visual asset</span>
                    <span className="font-medium text-foreground">{hasImage ? 'Collegato' : 'Placeholder'}</span>
                  </div>
                </div>
              </SectionCard>
            </aside>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ExerciseDetailDialog;
