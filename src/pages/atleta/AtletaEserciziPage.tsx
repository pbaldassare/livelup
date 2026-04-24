import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AtletaExerciseDetailSheet } from '@/components/app/AtletaExerciseDetailSheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ListSkeleton } from '@/components/skeletons';
import { useAuth } from '@/hooks/useAuth';
import { useAtletaStatus } from '@/hooks/useAtletaStatus';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Dumbbell,
  Lock,
  Check,
  Plus,
  Minus,
  Timer,
  Repeat,
  CheckCircle2,
  SkipForward,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// ATLETA ESERCIZI PAGE — vista operativa "del giorno"
// Priorità: in_corso > in_sospeso > attivo oggi > prossimo attivo
// Azioni: Completa / Salta
// =====================================================

interface DayExercise {
  id: string;
  order_index: number;
  prescribed_sets: number;
  prescribed_reps_min: number | null;
  prescribed_reps_max: number | null;
  rest_seconds: number | null;
  notes: string | null;
  prescribed_duration_seconds?: number | null;
  prescribed_weight?: number | null;
  sets_data?: unknown;
  protocol_type?: string | null;
  protocol_params?: Record<string, unknown> | null;
  exercises: {
    name: string;
    category: string | null;
    video_url?: string | null;
    image_url?: string | null;
    instructions?: string | null;
    muscle_groups?: string[] | null;
  } | null;
}

type WorkoutContext = 'in_corso' | 'in_sospeso' | 'oggi' | 'prossimo';

interface DayWorkout {
  id: string;
  title: string;
  status: string;
  scheduled_date: string | null;
  context: WorkoutContext;
  workout_exercises: DayExercise[];
}

const STORAGE_KEY_PREFIX = 'atleta-esercizi-tracking-';

const SELECT_CLAUSE = `
  id,
  title,
  status,
  scheduled_date,
  workout_exercises (
    id,
    order_index,
    prescribed_sets,
    prescribed_reps_min,
    prescribed_reps_max,
    prescribed_weight,
    prescribed_duration_seconds,
    rest_seconds,
    notes,
    sets_data,
    protocol_type,
    protocol_params,
    exercises:exercise_id ( name, category, video_url, image_url, instructions, muscle_groups )
  )
`;

async function fetchPriorityWorkout(userId: string): Promise<DayWorkout | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 1. in_corso — qualsiasi data, il più recente
  const { data: inCorso } = await supabase
    .from('workouts')
    .select(SELECT_CLAUSE)
    .eq('atleta_user_id', userId)
    .eq('status', 'in_corso')
    .order('scheduled_date', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (inCorso) return wrap(inCorso, 'in_corso');

  // 2. in_sospeso
  const { data: inSospeso } = await supabase
    .from('workouts')
    .select(SELECT_CLAUSE)
    .eq('atleta_user_id', userId)
    .eq('status', 'in_sospeso')
    .order('scheduled_date', { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (inSospeso) return wrap(inSospeso, 'in_sospeso');

  // 3. attivo OGGI
  const { data: oggi } = await supabase
    .from('workouts')
    .select(SELECT_CLAUSE)
    .eq('atleta_user_id', userId)
    .eq('status', 'attivo')
    .gte('scheduled_date', today.toISOString().slice(0, 10))
    .lt('scheduled_date', tomorrow.toISOString().slice(0, 10))
    .order('scheduled_date', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (oggi) return wrap(oggi, 'oggi');

  // 4. attivo prossimo (futuro)
  const { data: prossimo } = await supabase
    .from('workouts')
    .select(SELECT_CLAUSE)
    .eq('atleta_user_id', userId)
    .eq('status', 'attivo')
    .gte('scheduled_date', today.toISOString().slice(0, 10))
    .order('scheduled_date', { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (prossimo) return wrap(prossimo, 'prossimo');

  return null;
}

function wrap(raw: any, context: WorkoutContext): DayWorkout {
  return {
    ...raw,
    context,
    workout_exercises: (raw.workout_exercises || []).sort(
      (a: DayExercise, b: DayExercise) => a.order_index - b.order_index,
    ),
  } as DayWorkout;
}

export function AtletaEserciziPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { canAccessWorkouts, isLoading: statusLoading } = useAtletaStatus();
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<'complete' | 'skip' | null>(
    null,
  );
  const [selectedExercise, setSelectedExercise] = useState<DayExercise | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: workout, isLoading } = useQuery({
    queryKey: ['atleta-esercizi-priority', user?.id],
    queryFn: () => (user?.id ? fetchPriorityWorkout(user.id) : Promise.resolve(null)),
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

  const getExerciseStatus = (ex: DayExercise): 'not_started' | 'in_progress' | 'completed' => {
    const done = completedSets[ex.id] || 0;
    if (done <= 0) return 'not_started';
    if (done < ex.prescribed_sets) return 'in_progress';
    return 'completed';
  };

  const openExercise = (ex: DayExercise) => {
    setSelectedExercise(ex);
    setDetailOpen(true);
  };

  const completeWorkout = async () => {
    if (!workout) return;
    setActionLoading('complete');
    try {
      const { error } = await supabase
        .from('workouts')
        .update({
          status: 'completato',
          completed_at: new Date().toISOString(),
        })
        .eq('id', workout.id);
      if (error) throw error;
      try {
        if (storageKey) localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
      toast({ title: 'Allenamento completato 💪', description: 'Bravo!' });
      await queryClient.invalidateQueries({
        queryKey: ['atleta-esercizi-priority'],
      });
      await queryClient.invalidateQueries({ queryKey: ['atleta-programma-attivo'] });
    } catch (e: any) {
      toast({
        title: 'Errore',
        description: e?.message ?? 'Impossibile completare',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const skipWorkout = async () => {
    if (!workout) return;
    setActionLoading('skip');
    try {
      const { error } = await supabase
        .from('workouts')
        .update({ status: 'saltato' as any })
        .eq('id', workout.id);
      if (error) throw error;
      try {
        if (storageKey) localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
      toast({ title: 'Allenamento saltato', description: 'Passiamo al prossimo.' });
      await queryClient.invalidateQueries({
        queryKey: ['atleta-esercizi-priority'],
      });
      await queryClient.invalidateQueries({ queryKey: ['atleta-programma-attivo'] });
      setSkipDialogOpen(false);
    } catch (e: any) {
      toast({
        title: 'Errore',
        description: e?.message ?? 'Impossibile saltare',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

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

  const ctxBadge = workout ? contextBadge(workout) : null;

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
                Nessun allenamento disponibile
              </h3>
              <p className="text-sm text-app-muted-foreground mb-4">
                Hai completato tutti gli allenamenti programmati. Controlla il
                tuo programma per vedere lo storico o scopri nuovi contenuti.
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" className="border-app-border" asChild>
                  <Link to="/app/programma">Vai al programma</Link>
                </Button>
                <Button
                  className="bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
                  asChild
                >
                  <Link to="/app/discover">Scopri</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="px-4 space-y-4">
          {/* Context badge */}
          {ctxBadge && (
            <Badge
              variant="outline"
              className={cn(
                'text-[11px] font-semibold gap-1.5 px-2.5 py-1',
                ctxBadge.cls,
              )}
            >
              {ctxBadge.label}
            </Badge>
          )}

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
          <div className="overflow-hidden rounded-2xl border border-app-border bg-app-card divide-y divide-app-border">
            {workout.workout_exercises.map((ex, idx) => {
              const done = completedSets[ex.id] || 0;
              const total = ex.prescribed_sets;
              const status = getExerciseStatus(ex);
              const isDuration = !!ex.prescribed_duration_seconds && ex.prescribed_duration_seconds > 0;
              const durationLabel = isDuration
                ? formatDuration(ex.prescribed_duration_seconds!)
                : null;
              const repsCount = formatReps(ex.prescribed_reps_min, ex.prescribed_reps_max);
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => openExercise(ex)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-app-muted/35',
                    status === 'in_progress' && 'bg-app-accent/5',
                    status === 'completed' && 'opacity-65',
                  )}
                >
                  <div
                    className={cn(
                      'h-16 w-16 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center bg-app-muted border-2',
                      status === 'in_progress' ? 'border-app-accent' : 'border-transparent',
                    )}
                  >
                    {ex.exercises?.image_url ? (
                      <img
                        src={ex.exercises.image_url}
                        alt={ex.exercises.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Dumbbell className="h-7 w-7 text-app-muted-foreground/60" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="truncate text-lg font-bold text-app-foreground">
                        {ex.exercises?.name || 'Esercizio'}
                      </h3>
                      <span className="text-[10px] text-app-muted-foreground tabular-nums">
                        #{idx + 1}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-app-muted-foreground">
                      {isDuration ? (
                        <>
                          <Timer className="h-3.5 w-3.5" />
                          <span className="tabular-nums">{durationLabel}</span>
                        </>
                      ) : (
                        <>
                          <Repeat className="h-3.5 w-3.5" />
                          <span className="tabular-nums">×{repsCount}</span>
                        </>
                      )}
                      {status === 'in_progress' && (
                        <span className="text-xs font-medium text-app-accent">
                          · {done}/{total} set
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-2">
                    {status === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5 text-app-accent" />
                    ) : status === 'in_progress' ? (
                      <span className="h-2.5 w-2.5 rounded-full bg-app-accent animate-pulse" />
                    ) : (
                      <span className="h-2.5 w-2.5 rounded-full border border-app-muted-foreground/40" />
                    )}
                    <ChevronRight className="h-5 w-5 text-app-muted-foreground" />
                  </div>
                </button>
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

          {/* Azioni Completa / Salta */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="border-app-border bg-app-muted/30 text-app-foreground hover:bg-app-muted"
              onClick={() => setSkipDialogOpen(true)}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'skip' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <SkipForward className="h-4 w-4 mr-2" />
              )}
              Salta
            </Button>
            <Button
              className="bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
              onClick={completeWorkout}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'complete' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Completa
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Saltare l'allenamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Verrà marcato come saltato e non sarà più recuperato. Il tuo
              programma continuerà normalmente con il prossimo allenamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                skipWorkout();
              }}
              disabled={actionLoading !== null}
            >
              Salta allenamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function contextBadge(w: DayWorkout): { label: string; cls: string } {
  switch (w.context) {
    case 'in_corso':
      return {
        label: 'IN CORSO',
        cls: 'bg-app-accent/20 text-app-accent border-app-accent/40',
      };
    case 'in_sospeso':
      return {
        label: 'DA RECUPERARE',
        cls: 'bg-warning/20 text-warning border-warning/40',
      };
    case 'oggi':
      return {
        label: 'OGGI',
        cls: 'bg-app-accent/20 text-app-accent border-app-accent/40',
      };
    case 'prossimo':
      return {
        label: w.scheduled_date
          ? `PROSSIMO · ${format(parseISO(w.scheduled_date), 'EEE d MMM', { locale: it })}`
          : 'PROSSIMO',
        cls: 'bg-app-muted/40 text-app-foreground border-app-border',
      };
  }
}

function formatReps(min: number | null, max: number | null): string {
  if (min && max && min !== max) return `${min}–${max}`;
  if (min) return String(min);
  if (max) return String(max);
  return '—';
}

export default AtletaEserciziPage;
