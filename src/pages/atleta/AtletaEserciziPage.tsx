import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ListSkeleton } from '@/components/skeletons';
import { useAuth } from '@/hooks/useAuth';
import { useAtletaStatus } from '@/hooks/useAtletaStatus';
import { supabase } from '@/integrations/supabase/client';
import {
  Dumbbell,
  Lock,
  Check,
  Plus,
  Minus,
  Timer,
  Repeat,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// ATLETA ESERCIZI PAGE
// Vista operativa: esercizi del giorno con tracking serie
// =====================================================

interface DayExercise {
  id: string;
  order_index: number;
  prescribed_sets: number;
  prescribed_reps_min: number | null;
  prescribed_reps_max: number | null;
  rest_seconds: number | null;
  notes: string | null;
  exercises: {
    name: string;
    category: string | null;
  } | null;
}

interface DayWorkout {
  id: string;
  title: string;
  workout_exercises: DayExercise[];
}

const STORAGE_KEY_PREFIX = 'atleta-esercizi-tracking-';

export function AtletaEserciziPage() {
  const { user } = useAuth();
  const { canAccessWorkouts, isLoading: statusLoading } = useAtletaStatus();

  const { data: workout, isLoading } = useQuery({
    queryKey: ['atleta-esercizi-oggi', user?.id],
    queryFn: async (): Promise<DayWorkout | null> => {
      if (!user?.id) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Priorità: workout attivo programmato per oggi → altrimenti il prossimo attivo
      const { data: todayData, error: errToday } = await supabase
        .from('workouts')
        .select(`
          id,
          title,
          workout_exercises (
            id,
            order_index,
            prescribed_sets,
            prescribed_reps_min,
            prescribed_reps_max,
            rest_seconds,
            notes,
            exercises:exercise_id ( name, category )
          )
        `)
        .eq('atleta_user_id', user.id)
        .eq('status', 'attivo')
        .gte('scheduled_date', today.toISOString().slice(0, 10))
        .lt('scheduled_date', tomorrow.toISOString().slice(0, 10))
        .order('scheduled_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (errToday) throw errToday;

      let chosen = todayData;
      if (!chosen) {
        const { data: nextData } = await supabase
          .from('workouts')
          .select(`
            id,
            title,
            workout_exercises (
              id,
              order_index,
              prescribed_sets,
              prescribed_reps_min,
              prescribed_reps_max,
              rest_seconds,
              notes,
              exercises:exercise_id ( name, category )
            )
          `)
          .eq('atleta_user_id', user.id)
          .eq('status', 'attivo')
          .order('scheduled_date', { ascending: true, nullsFirst: false })
          .limit(1)
          .maybeSingle();
        chosen = nextData;
      }

      if (!chosen) return null;
      return {
        ...chosen,
        workout_exercises: (chosen.workout_exercises || []).sort(
          (a, b) => a.order_index - b.order_index,
        ),
      } as DayWorkout;
    },
    enabled: !!user?.id && canAccessWorkouts,
  });

  // Tracking locale (persistito su localStorage per workout)
  const storageKey = workout ? `${STORAGE_KEY_PREFIX}${workout.id}` : null;
  const [completedSets, setCompletedSets] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setCompletedSets(JSON.parse(raw));
      else setCompletedSets({});
    } catch {
      setCompletedSets({});
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(completedSets));
    } catch {
      // ignore quota errors
    }
  }, [completedSets, storageKey]);

  const totalSets = useMemo(
    () =>
      workout?.workout_exercises.reduce(
        (sum, ex) => sum + (ex.prescribed_sets || 0),
        0,
      ) ?? 0,
    [workout],
  );
  const doneSets = useMemo(
    () => Object.values(completedSets).reduce((a, b) => a + b, 0),
    [completedSets],
  );
  const progressPct = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;

  const incrementSet = (exId: string, max: number) => {
    setCompletedSets((prev) => {
      const cur = prev[exId] || 0;
      return { ...prev, [exId]: Math.min(cur + 1, max) };
    });
  };

  const decrementSet = (exId: string) => {
    setCompletedSets((prev) => {
      const cur = prev[exId] || 0;
      return { ...prev, [exId]: Math.max(cur - 1, 0) };
    });
  };

  const resetTracking = () => setCompletedSets({});

  // Locked
  if (!statusLoading && !canAccessWorkouts) {
    return (
      <div className="p-4 space-y-6 bg-app-background min-h-screen">
        <h1 className="text-2xl font-bold text-app-foreground pt-2">Esercizi</h1>
        <Card className="border-dashed bg-app-card border-app-border">
          <CardContent className="p-8 text-center">
            <Lock className="h-12 w-12 mx-auto text-app-muted-foreground mb-4" />
            <h3 className="font-semibold text-app-foreground mb-2">
              Nessun Coach collegato
            </h3>
            <p className="text-sm text-app-muted-foreground mb-4">
              Collegati a un Coach per ricevere esercizi.
            </p>
            <Button
              className="bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
              asChild
            >
              <Link to="/app/discover">Trova un Coach</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="pb-4 bg-app-background min-h-screen">
      {/* Header */}
      <div className="p-4 space-y-1">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-app-accent" />
          <h1 className="text-2xl font-bold text-app-foreground">Esercizi</h1>
        </div>
        <p className="text-sm text-app-muted-foreground">Allenamento del giorno</p>
      </div>

      {isLoading ? (
        <div className="px-4">
          <ListSkeleton count={3} type="workout" />
        </div>
      ) : !workout ? (
        <div className="px-4">
          <Card className="border-dashed bg-app-card border-app-border">
            <CardContent className="p-8 text-center">
              <Dumbbell className="h-10 w-10 mx-auto text-app-muted-foreground mb-3" />
              <h3 className="font-semibold text-app-foreground mb-1">
                Nessun esercizio per oggi
              </h3>
              <p className="text-sm text-app-muted-foreground">
                Non hai allenamenti programmati al momento.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="px-4 space-y-4">
          {/* Progress summary */}
          <Card className="bg-app-card border-app-border">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-bold text-app-foreground truncate">
                    {workout.title}
                  </h2>
                  <p className="text-xs text-app-muted-foreground">
                    {doneSets} di {totalSets} serie completate
                  </p>
                </div>
                <Badge
                  className={cn(
                    'border-0',
                    progressPct === 100
                      ? 'bg-success/20 text-success'
                      : 'bg-app-accent/20 text-app-accent',
                  )}
                >
                  {progressPct}%
                </Badge>
              </div>
              <Progress value={progressPct} className="h-2" />
              {doneSets > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetTracking}
                  className="text-xs text-app-muted-foreground hover:text-app-foreground h-7 px-2"
                >
                  Azzera tracking
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Exercise list */}
          <div className="space-y-2">
            {workout.workout_exercises.map((ex, idx) => {
              const done = completedSets[ex.id] || 0;
              const total = ex.prescribed_sets;
              const isComplete = done >= total && total > 0;
              return (
                <Card
                  key={ex.id}
                  className={cn(
                    'bg-app-card border-app-border transition-colors',
                    isComplete && 'border-success/40 bg-success/5',
                  )}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                          isComplete
                            ? 'bg-success/20'
                            : 'bg-app-accent/20',
                        )}
                      >
                        {isComplete ? (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        ) : (
                          <span className="text-sm font-bold text-app-accent">
                            {idx + 1}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-app-foreground">
                          {ex.exercises?.name || 'Esercizio'}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-app-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <Repeat className="h-3 w-3" />
                            {formatReps(
                              ex.prescribed_reps_min,
                              ex.prescribed_reps_max,
                            )}{' '}
                            reps
                          </span>
                          {ex.rest_seconds ? (
                            <span className="flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              {ex.rest_seconds}s
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Set tracker */}
                    <div className="pl-11 space-y-2">
                      {/* Set dots */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {Array.from({ length: total }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              'h-6 w-6 rounded-full flex items-center justify-center border transition-colors',
                              i < done
                                ? 'bg-success border-success'
                                : 'border-app-border bg-app-muted/30',
                            )}
                          >
                            {i < done ? (
                              <Check className="h-3.5 w-3.5 text-success-foreground" />
                            ) : (
                              <Circle className="h-2 w-2 text-app-muted-foreground" />
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Counter controls */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-app-muted-foreground">
                          Serie completate{' '}
                          <span className="font-semibold text-app-foreground">
                            {done}/{total}
                          </span>
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 border-app-border bg-app-muted/30 hover:bg-app-muted text-app-foreground"
                            onClick={() => decrementSet(ex.id)}
                            disabled={done === 0}
                            aria-label="Rimuovi serie"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            className="h-8 w-8 bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
                            onClick={() => incrementSet(ex.id, total)}
                            disabled={done >= total}
                            aria-label="Aggiungi serie"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* CTA esecuzione guidata */}
          <Button
            variant="outline"
            className="w-full border-app-border bg-app-muted/30 text-app-foreground hover:bg-app-muted"
            asChild
          >
            <Link to={`/app/workout/${workout.id}`}>
              Apri esecuzione guidata
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function formatReps(min: number | null, max: number | null): string {
  if (min && max && min !== max) return `${min}–${max}`;
  if (min) return String(min);
  if (max) return String(max);
  return '—';
}

export default AtletaEserciziPage;
