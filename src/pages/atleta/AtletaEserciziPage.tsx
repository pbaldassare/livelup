import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { completeWorkout as completeWorkoutApi } from '@/lib/api/workouts';
import { toast } from '@/hooks/use-toast';
import {
  Dumbbell,
  Lock,
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
  const navigate = useNavigate();
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
      await completeWorkoutApi(workout.id, { recomputeFromLogs: true });
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
      await queryClient.invalidateQueries({ queryKey: ['workout-history'] });
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
    <div className="min-h-screen bg-app-background pb-6">
      {/* Header */}
      <div className="mx-auto max-w-lg px-5 pb-3 pt-5">
        <h1 className="text-[2rem] font-black leading-none text-app-foreground">Esercizi</h1>
        <p className="mt-2 text-sm text-app-muted-foreground">Libreria del tuo allenamento</p>
      </div>

      {isLoading ? (
        <div className="mx-auto max-w-lg px-5">
          <ListSkeleton count={3} type="workout" />
        </div>
      ) : !workout ? (
        <div className="mx-auto max-w-lg px-5">
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
        <div className="mx-auto max-w-lg space-y-5 px-5">
          <div className="space-y-3 rounded-2xl border border-app-border/70 bg-app-card/55 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {ctxBadge && (
                    <Badge
                      variant="outline"
                      className={cn('px-2 py-0.5 text-[10px] font-bold', ctxBadge.cls)}
                    >
                      {ctxBadge.label}
                    </Badge>
                  )}
                  <span className="text-xs font-semibold text-app-muted-foreground tabular-nums">
                    {progressPct}%
                  </span>
                </div>
                <h2 className="mt-2 truncate text-base font-bold text-app-foreground">
                  {workout.title}
                </h2>
                <p className="mt-1 text-xs text-app-muted-foreground">
                  {doneSets} di {totalSets} serie completate
                </p>
              </div>
              {doneSets > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetTracking}
                  className="h-8 shrink-0 px-2 text-xs text-app-muted-foreground hover:text-app-foreground"
                >
                  Azzera
                </Button>
              )}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-app-muted">
              <div
                className="h-full rounded-full bg-app-accent transition-all"
                style={{ width: `${Math.min(progressPct, 100)}%` }}
              />
            </div>
          </div>

          {/* Exercise list */}
          <div className="overflow-hidden rounded-[1.35rem] border border-app-border/70 bg-app-card/35 divide-y divide-app-border/70">
            {workout.workout_exercises.map((ex, idx) => {
              const status = getExerciseStatus(ex);
              const isDuration = !!ex.prescribed_duration_seconds && ex.prescribed_duration_seconds > 0;
              const durationLabel = isDuration
                ? formatDuration(ex.prescribed_duration_seconds!)
                : null;
              const repsCount = formatReps(ex.prescribed_reps_min, ex.prescribed_reps_max);
              const statusInfo = exerciseStatusInfo(status);
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => openExercise(ex)}
                  className={cn(
                    'group flex w-full items-center gap-4 px-3 py-4 text-left transition-colors hover:bg-app-muted/25 active:bg-app-muted/40',
                    status === 'in_progress' && 'bg-app-accent/[0.04]',
                    status === 'completed' && 'opacity-75',
                  )}
                >
                  <div
                    className={cn(
                      'h-[5.75rem] w-[5.75rem] flex-shrink-0 overflow-hidden rounded-[1.15rem] bg-app-muted flex items-center justify-center ring-1 ring-app-border/70',
                      status === 'in_progress' && 'ring-2 ring-app-accent/80',
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
                      <div className="flex h-full w-full items-center justify-center bg-app-muted">
                        <Dumbbell className="h-8 w-8 text-app-muted-foreground/55" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 py-1">
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <h3 className="min-w-0 truncate text-xl font-extrabold leading-tight text-app-foreground">
                        {ex.exercises?.name || 'Esercizio'}
                      </h3>
                      <span className="shrink-0 text-[10px] font-semibold text-app-muted-foreground tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-base font-bold text-app-muted-foreground tabular-nums">
                        {isDuration ? durationLabel : `x${repsCount}`}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full', statusInfo.dotClass)} />
                      <span className={cn('text-[11px] font-semibold uppercase', statusInfo.textClass)}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 items-center">
                    {status === 'completed' && (
                      <CheckCircle2 className="mr-1 h-5 w-5 text-app-accent" />
                    )}
                    <ChevronRight className="h-5 w-5 text-app-muted-foreground transition-transform group-hover:translate-x-0.5" />
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

          <AtletaExerciseDetailSheet
            open={detailOpen}
            onOpenChange={setDetailOpen}
            exercise={selectedExercise as any}
            completedSetsForEx={
              selectedExercise
                ? Array.from({ length: completedSets[selectedExercise.id] || 0 }, (_, i) => i + 1)
                : []
            }
            status={selectedExercise ? getExerciseStatus(selectedExercise) : 'not_started'}
            onStart={() => workout && navigate(`/app/workout/${workout.id}`)}
            onMarkAllCompleted={() => {
              if (!selectedExercise) return;
              setCompletedSets((prev) => ({
                ...prev,
                [selectedExercise.id]: selectedExercise.prescribed_sets,
              }));
              toast({ title: 'Esercizio completato' });
              setDetailOpen(false);
            }}
          />
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

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function exerciseStatusInfo(status: 'not_started' | 'in_progress' | 'completed') {
  switch (status) {
    case 'completed':
      return {
        label: 'Completato',
        dotClass: 'bg-app-accent',
        textClass: 'text-app-accent',
      };
    case 'in_progress':
      return {
        label: 'In corso',
        dotClass: 'bg-app-accent animate-pulse',
        textClass: 'text-app-accent',
      };
    default:
      return {
        label: 'Non iniziato',
        dotClass: 'border border-app-muted-foreground/60',
        textClass: 'text-app-muted-foreground',
      };
  }
}

export default AtletaEserciziPage;
