import { useState } from 'react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
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
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Build sets array — compatible with future per-set protocols
function buildSets(ex: SheetExercise) {
  const reps = ex.prescribed_reps_max
    ? `${ex.prescribed_reps_min ?? ex.prescribed_reps_max}-${ex.prescribed_reps_max}`
    : ex.prescribed_reps_min
    ? `${ex.prescribed_reps_min}`
    : null;
  return Array.from({ length: Math.max(ex.prescribed_sets || 0, 0) }, (_, i) => ({
    n: i + 1,
    reps,
    weight: ex.prescribed_weight ?? null,
    rest: ex.rest_seconds ?? null,
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
  const sets = buildSets(exercise);
  const muscleGroups = ex.muscle_groups || [];

  const isDuration =
    !!exercise.prescribed_duration_seconds && exercise.prescribed_duration_seconds > 0;
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
          className="h-[92dvh] p-0 bg-app-background border-app-border overflow-hidden flex flex-col"
        >
          {/* Header sticky */}
          <div className="sticky top-0 z-10 bg-app-background/95 backdrop-blur border-b border-app-border">
            <div className="flex items-center justify-between p-4">
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 -ml-2 hover:bg-app-muted rounded-lg transition-colors"
                aria-label="Indietro"
              >
                <ArrowLeft className="h-5 w-5 text-app-foreground" />
              </button>
              <h2 className="font-semibold text-app-foreground text-base truncate max-w-[60%] text-center">
                {ex.name}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                disabled
                className="text-app-muted-foreground opacity-60"
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
                <TabsList className="grid w-full grid-cols-3 bg-app-muted">
                  <TabsTrigger value="animazione">Animazione</TabsTrigger>
                  <TabsTrigger value="muscoli">Muscoli</TabsTrigger>
                  <TabsTrigger value="tutorial">Tutorial</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="animazione" className="mt-4 px-4 pb-6 space-y-5">
                {/* Media */}
                <div className="rounded-2xl overflow-hidden bg-app-muted aspect-[16/10] relative">
                  {youtubeId ? (
                    <button
                      onClick={() => setVideoOpen(true)}
                      className="w-full h-full relative group"
                    >
                      <img
                        src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                        alt={ex.name}
                        className="w-full h-full object-cover"
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
                  ) : ex.image_url ? (
                    <img
                      src={ex.image_url}
                      alt={ex.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Dumbbell className="h-16 w-16 text-app-muted-foreground/40" />
                    </div>
                  )}
                </div>

                {/* Duration OR Reps (mai entrambi) */}
                <div className="flex items-center gap-2 text-app-foreground">
                  {isDuration ? (
                    <>
                      <Clock className="h-5 w-5 text-app-accent" />
                      <span className="text-sm text-app-muted-foreground">Durata</span>
                      <span className="font-bold tabular-nums">
                        {formatDuration(exercise.prescribed_duration_seconds!)}
                      </span>
                    </>
                  ) : (
                    <>
                      <Repeat className="h-5 w-5 text-app-accent" />
                      <span className="text-sm text-app-muted-foreground">Reps</span>
                      <span className="font-bold tabular-nums">{repsLabel}</span>
                    </>
                  )}
                </div>

                {/* Istruzioni */}
                {ex.instructions && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-app-foreground">Esecuzione</h3>
                    <p className="text-sm text-app-muted-foreground whitespace-pre-line leading-relaxed">
                      {ex.instructions}
                    </p>
                  </div>
                )}

                {/* Area di focus */}
                {muscleGroups.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-app-foreground">Area di focus</h3>
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

                {/* Set verticali */}
                {sets.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-app-foreground">Set</h3>
                    <div className="space-y-2">
                      {sets.map((s) => {
                        const done = completedSetsForEx.includes(s.n);
                        return (
                          <div
                            key={s.n}
                            className={cn(
                              'rounded-xl border border-app-border bg-app-card p-4 transition-opacity',
                              done && 'opacity-60'
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-app-foreground">
                                Set {s.n}
                              </span>
                              {done && (
                                <CheckCircle2 className="h-5 w-5 text-app-accent" />
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-app-muted-foreground">
                              {s.reps !== null && (
                                <span>
                                  Reps:{' '}
                                  <span className="text-app-foreground font-medium">
                                    {s.reps}
                                  </span>
                                </span>
                              )}
                              {s.weight !== null && s.weight > 0 && (
                                <span>
                                  Kg:{' '}
                                  <span className="text-app-foreground font-medium">
                                    {s.weight}
                                  </span>
                                </span>
                              )}
                              {s.rest !== null && s.rest > 0 && (
                                <span>
                                  Recupero:{' '}
                                  <span className="text-app-foreground font-medium">
                                    {s.rest}s
                                  </span>
                                </span>
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
                  <div className="rounded-xl bg-app-card border border-app-border p-4">
                    <p className="text-xs text-app-muted-foreground mb-1">Note del coach</p>
                    <p className="text-sm text-app-foreground whitespace-pre-line">
                      {exercise.notes}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="muscoli" className="mt-4 px-4 pb-6">
                <div className="rounded-xl bg-app-card border border-app-border p-8 text-center">
                  <p className="text-sm text-app-muted-foreground">In arrivo 🚧</p>
                </div>
              </TabsContent>

              <TabsContent value="tutorial" className="mt-4 px-4 pb-6">
                <div className="rounded-xl bg-app-card border border-app-border p-8 text-center">
                  <p className="text-sm text-app-muted-foreground">In arrivo 🚧</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer sticky */}
          <div className="sticky bottom-0 z-10 bg-app-background/95 backdrop-blur border-t border-app-border p-4 flex flex-col gap-2">
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
      {youtubeId && (
        <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
          <DialogContent className="max-w-3xl p-0 bg-black border-app-border overflow-hidden">
            <div className="aspect-video w-full">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                title={ex.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default AtletaExerciseDetailSheet;
