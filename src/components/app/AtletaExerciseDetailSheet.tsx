import { useState } from 'react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Dumbbell,
  Play,
  Clock,
  Repeat,
  CheckCircle2,
  TimerReset,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveSetsData } from '@/lib/setsData';
import { AtletaEmomSummary } from '@/components/app/AtletaEmomSummary';

// =====================================================
// ATLETA EXERCISE DETAIL SHEET
// Full-screen detail view for a single workout exercise
// =====================================================

interface SheetExercise {
  id: string;
  prescribed_sets: number;
  prescribed_reps_min?: number;
  prescribed_reps_max?: number;
  prescribed_duration_seconds?: number | null;
  prescribed_weight?: number;
  rest_seconds?: number;
  notes?: string;
  sets_data?: unknown;
  protocol_type?: string | null;
  protocol_params?: Record<string, unknown> | null;
  exercises: {
    name: string;
    category?: string;
    video_url?: string;
    image_url?: string;
    instructions?: string;
    muscle_groups?: string[];
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: SheetExercise | null;
  completedSetsForEx: number[];
  status: 'not_started' | 'in_progress' | 'completed';
  onStart: () => void;
  onMarkAllCompleted: () => Promise<void> | void;
}

// Extract YouTube video ID from various URL formats
function getYouTubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&?\/\s]+)/
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

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Build sets array — compatible with future per-set protocols
function buildSets(ex: SheetExercise) {
  const resolved = resolveSetsData(ex.sets_data, {
    sets: ex.prescribed_sets,
    reps_min: ex.prescribed_reps_min,
    reps_max: ex.prescribed_reps_max,
    rest_seconds: ex.rest_seconds,
    prescribed_duration_seconds: ex.prescribed_duration_seconds,
  });

  return resolved.map((set, i) => ({
    n: i + 1,
    reps: set.reps !== null ? String(set.reps) : null,
    weight: set.weight ?? ex.prescribed_weight ?? null,
    rest: set.rest_seconds ?? null,
  }));
}

export function AtletaExerciseDetailSheet({
  open,
  onOpenChange,
  exercise,
  completedSetsForEx,
  status,
  onStart,
  onMarkAllCompleted,
}: Props) {
  const [videoOpen, setVideoOpen] = useState(false);
  const [marking, setMarking] = useState(false);

  if (!exercise) return null;

  const ex = exercise.exercises;
  const youtubeId = ex.video_url ? getYouTubeVideoId(ex.video_url) : null;
  const vimeoId = ex.video_url ? getVimeoVideoId(ex.video_url) : null;
  const isUploadedVideo = ex.video_url ? isVideoFileUrl(ex.video_url) : false;
  const hasVideo = !!ex.video_url;
  const sets = buildSets(exercise);
  const muscleGroups = ex.muscle_groups || [];

  const isDuration =
    !!exercise.prescribed_duration_seconds && exercise.prescribed_duration_seconds > 0;
  const isSetProtocol = !exercise.protocol_type || exercise.protocol_type === 'SET';
  const repsLabel = exercise.prescribed_reps_max
    ? `×${exercise.prescribed_reps_min ?? exercise.prescribed_reps_max}-${exercise.prescribed_reps_max}`
    : `×${exercise.prescribed_reps_min ?? 0}`;

  const handleMark = async () => {
    setMarking(true);
    try {
      await onMarkAllCompleted();
    } finally {
      setMarking(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[94dvh] p-0 bg-app-background border-app-border overflow-hidden flex flex-col rounded-t-[1.75rem]"
        >
          {/* Header sticky */}
          <div className="sticky top-0 z-10 bg-app-background/95 backdrop-blur border-b border-app-border/70">
            <div className="flex items-center justify-between gap-3 p-4">
              <button
                onClick={() => onOpenChange(false)}
                className="-ml-2 rounded-full p-2 transition-colors hover:bg-app-muted"
                aria-label="Indietro"
              >
                <ArrowLeft className="h-5 w-5 text-app-foreground" />
              </button>
              <SheetTitle className="min-w-0 flex-1 truncate text-left text-xl font-black leading-tight text-app-foreground">
                {ex.name}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Dettaglio esercizio: nome, istruzioni e set.
              </SheetDescription>
              <Button
                variant="ghost"
                size="sm"
                disabled
                className="shrink-0 rounded-full text-app-muted-foreground opacity-60"
                title="Prossimamente"
              >
                Cambia
              </Button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue="animazione" className="w-full">
              <div className="px-4 pt-4">
                <TabsList className="grid h-11 w-full grid-cols-3 rounded-full bg-app-muted p-1">
                  <TabsTrigger value="animazione" className="rounded-full text-xs">Animazione</TabsTrigger>
                  <TabsTrigger value="muscoli" className="rounded-full text-xs">Muscoli</TabsTrigger>
                  <TabsTrigger value="tutorial" className="rounded-full text-xs">Tutorial</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="animazione" className="mt-4 px-4 pb-6 space-y-5">
                {/* Media */}
                <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-app-muted ring-1 ring-app-border/70 sm:aspect-[16/10]">
                  {youtubeId ? (
                    <button
                      onClick={() => setVideoOpen(true)}
                      className="w-full h-full relative group"
                    >
                      <img
                        src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                        alt={ex.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <div className="h-16 w-16 rounded-full bg-app-accent flex items-center justify-center shadow-xl">
                          <Play
                            className="h-7 w-7 text-app-accent-foreground ml-1"
                            fill="currentColor"
                          />
                        </div>
                      </div>
                    </button>
                  ) : isUploadedVideo && ex.video_url ? (
                    <video src={ex.video_url} controls poster={ex.image_url || undefined} className="h-full w-full bg-black object-contain" />
                  ) : ex.image_url ? (
                    <img
                      src={ex.image_url}
                      alt={ex.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-app-muted">
                      <Dumbbell className="h-16 w-16 text-app-muted-foreground/40" />
                    </div>
                  )}
                </div>

                {/* Duration OR Reps (mai entrambi) */}
                <div className="flex items-center gap-3 rounded-2xl border border-app-border/70 bg-app-card/55 p-4 text-app-foreground">
                  {isDuration ? (
                    <>
                      <Clock className="h-5 w-5 shrink-0 text-app-accent" />
                      <span className="text-sm font-medium text-app-muted-foreground">Durata</span>
                      <span className="ml-auto text-xl font-black tabular-nums">
                        {formatDuration(exercise.prescribed_duration_seconds!)}
                      </span>
                    </>
                  ) : (
                    <>
                      <Repeat className="h-5 w-5 shrink-0 text-app-accent" />
                      <span className="text-sm font-medium text-app-muted-foreground">Reps</span>
                      <span className="ml-auto text-xl font-black tabular-nums">{repsLabel}</span>
                    </>
                  )}
                </div>

                {/* EMOM a blocchi: vista riassuntiva (solo se EMOM con blocks[]) */}
                {exercise.protocol_type === 'EMOM' && (
                  <AtletaEmomSummary
                    params={exercise.protocol_params}
                    fallbackName={ex.name}
                  />
                )}

                {/* Ramping: note del coach (da protocol_params.note) */}
                {exercise.protocol_type === 'RAMPING' && typeof (exercise.protocol_params as any)?.note === 'string' && (exercise.protocol_params as any).note.trim() !== '' && (
                  <div className="rounded-xl border border-app-border bg-app-card/60 px-4 py-3">
                    <p className="text-xs text-app-muted-foreground mb-1">Note del coach</p>
                    <p className="text-sm text-app-foreground whitespace-pre-line">
                      {(exercise.protocol_params as any).note}
                    </p>
                  </div>
                )}

                {/* Istruzioni */}
                {ex.instructions && (
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-app-foreground">Esecuzione</h3>
                    <p className="text-sm text-app-muted-foreground whitespace-pre-line leading-relaxed">
                      {ex.instructions}
                    </p>
                  </div>
                )}

                {/* Area di focus */}
                {muscleGroups.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-app-foreground">Area di focus</h3>
                    <div className="flex flex-wrap gap-2">
                      {muscleGroups.map((m) => (
                        <Badge
                          key={m}
                          variant="outline"
                          className="border-app-accent/30 text-app-foreground bg-app-accent/10"
                        >
                          {m}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timer placeholder time-based */}
                {isDuration && (
                  <div className="rounded-xl border border-app-border bg-app-card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-app-muted-foreground">Timer esercizio</p>
                        <p className="text-2xl font-bold tabular-nums text-app-foreground">
                          {formatDuration(exercise.prescribed_duration_seconds!)}
                        </p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-app-accent/15 flex items-center justify-center">
                        <TimerReset className="h-6 w-6 text-app-accent" />
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-app-muted-foreground">
                      Timer live pronto per la futura esecuzione automatica.
                    </p>
                  </div>
                )}

                {/* Set verticali */}
                {isSetProtocol && !isDuration && sets.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-base font-bold text-app-foreground">Set</h3>
                    <div className="space-y-3">
                      {sets.map((s) => {
                        const done = completedSetsForEx.includes(s.n);
                        return (
                          <div
                            key={s.n}
                            className={cn(
                              'rounded-2xl border border-app-border/70 bg-app-card/60 p-4 transition-opacity',
                              done && 'opacity-60'
                            )}
                          >
                            <div className="mb-3 flex items-center justify-between">
                              <span className="text-lg font-black text-app-foreground">
                                Set {s.n}
                              </span>
                              {done && (
                                <CheckCircle2 className="h-5 w-5 text-app-accent" />
                              )}
                            </div>
                            <div className="grid gap-2 text-sm text-app-muted-foreground">
                              {s.reps !== null && (
                                <div className="flex items-center justify-between gap-3">
                                  <span>Reps</span>
                                  <span className="font-bold text-app-foreground">
                                    {s.reps}
                                  </span>
                                </div>
                              )}
                              {s.weight !== null && s.weight > 0 && (
                                <div className="flex items-center justify-between gap-3">
                                  <span>Kg</span>
                                  <span className="font-bold text-app-foreground">
                                    {s.weight}
                                  </span>
                                </div>
                              )}
                              {s.rest !== null && s.rest > 0 && (
                                <div className="flex items-center justify-between gap-3">
                                  <span>Recupero</span>
                                  <span className="font-bold text-app-foreground">
                                    {s.rest}s
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {exercise.notes && (
                  <div className="rounded-2xl bg-app-card/60 border border-app-border/70 p-4">
                    <p className="text-xs text-app-muted-foreground mb-1">Note del coach</p>
                    <p className="text-sm text-app-foreground whitespace-pre-line">
                      {exercise.notes}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="muscoli" className="mt-4 px-4 pb-6">
                <div className="rounded-2xl bg-app-card/60 border border-app-border/70 p-8 text-center">
                  <p className="text-sm text-app-muted-foreground">In arrivo</p>
                </div>
              </TabsContent>

              <TabsContent value="tutorial" className="mt-4 px-4 pb-6">
                {hasVideo ? (
                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-2xl border border-app-border/70 bg-black">
                      <div className="aspect-video w-full">
                        {youtubeId ? (
                          <iframe
                            src={`https://www.youtube.com/embed/${youtubeId}?modestbranding=1&rel=0`}
                            title={ex.name}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="h-full w-full"
                          />
                        ) : vimeoId ? (
                          <iframe
                            src={`https://player.vimeo.com/video/${vimeoId}`}
                            title={ex.name}
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                            className="h-full w-full"
                          />
                        ) : isUploadedVideo ? (
                          <video src={ex.video_url} controls poster={ex.image_url || undefined} className="h-full w-full bg-black object-contain" />
                        ) : (
                          <div className="flex h-full items-center justify-center p-6 text-center">
                            <Button asChild className="rounded-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90">
                              <a href={ex.video_url} target="_blank" rel="noopener noreferrer">
                                <Play className="mr-2 h-4 w-4" fill="currentColor" />
                                Apri video tutorial
                              </a>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    {ex.instructions && (
                      <div className="rounded-2xl border border-app-border/70 bg-app-card/60 p-4">
                        <h3 className="mb-2 text-base font-bold text-app-foreground">Punti chiave</h3>
                        <p className="whitespace-pre-line text-sm leading-relaxed text-app-muted-foreground">
                          {ex.instructions}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-app-card/60 border border-app-border/70 p-8 text-center">
                    <p className="text-sm text-app-muted-foreground">Nessun video tutorial disponibile</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer sticky */}
          <div className="sticky bottom-0 z-10 flex flex-col gap-2 border-t border-app-border/70 bg-app-background/95 p-4 backdrop-blur">
            <Button
              onClick={onStart}
              disabled={status === 'completed'}
              className="w-full h-12 bg-app-accent text-app-accent-foreground hover:bg-app-accent/90 rounded-full font-semibold"
            >
              <Play className="h-5 w-5 mr-2" fill="currentColor" />
              {status === 'in_progress' ? 'Riprendi esercizio' : 'Inizia esercizio'}
            </Button>
            <Button
              variant="outline"
              onClick={handleMark}
              disabled={status === 'completed' || marking}
              className="w-full h-12 border-app-border text-app-foreground hover:bg-app-muted rounded-full"
            >
              {marking ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {status === 'completed' ? 'Già completato' : 'Segna come completato'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Video modal */}
      {(youtubeId || vimeoId) && (
        <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
          <DialogContent className="max-w-3xl p-0 bg-black border-app-border overflow-hidden">
            <DialogTitle className="sr-only">{ex.name} – Video</DialogTitle>
            <DialogDescription className="sr-only">
              Video tutorial dell'esercizio
            </DialogDescription>
            <div className="aspect-video w-full">
              {youtubeId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                  title={ex.name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              ) : (
                <iframe
                  src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1`}
                  title={ex.name}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default AtletaExerciseDetailSheet;
