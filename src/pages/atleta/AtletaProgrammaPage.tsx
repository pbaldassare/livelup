import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format, parseISO, startOfWeek, differenceInCalendarWeeks, isToday } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ListSkeleton } from '@/components/skeletons';
import { useAuth } from '@/hooks/useAuth';
import { useAtletaStatus } from '@/hooks/useAtletaStatus';
import {
  getAtletaActiveProgram,
  type AtletaProgramWorkout,
} from '@/lib/api/programs';
import {
  CalendarDays,
  Calendar,
  Lock,
  CheckCircle2,
  XCircle,
  Clock,
  Circle,
  ChevronRight,
  Trophy,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// ATLETA PROGRAMMA PAGE
// Vista d'insieme del programma assegnato dal Coach.
// SOLO visione: ogni giornata mostra il proprio stato.
// L'esecuzione avviene da /app/esercizi.
// =====================================================

const DAY_LABELS = ['', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

type StatusVariant = 'completato' | 'saltato' | 'in_corso' | 'in_sospeso' | 'futuro';

function mapStatus(status: string, scheduledDate: string | null): StatusVariant {
  if (status === 'completato') return 'completato';
  if (status === 'saltato' || status === 'scaduto') return 'saltato';
  if (status === 'in_corso') return 'in_corso';
  if (status === 'in_sospeso') return 'in_sospeso';
  // 'attivo'
  if (!scheduledDate) return 'futuro';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(scheduledDate);
  d.setHours(0, 0, 0, 0);
  return d < today ? 'saltato' : 'futuro';
}

function StatusBadge({ variant }: { variant: StatusVariant }) {
  const map: Record<
    StatusVariant,
    { label: string; cls: string; Icon: typeof CheckCircle2 }
  > = {
    completato: {
      label: 'Completato',
      cls: 'bg-success/20 text-success border-success/30',
      Icon: CheckCircle2,
    },
    saltato: {
      label: 'Saltato',
      cls: 'bg-app-muted/50 text-app-muted-foreground border-app-border',
      Icon: XCircle,
    },
    in_corso: {
      label: 'In corso',
      cls: 'bg-app-accent/20 text-app-accent border-app-accent/30',
      Icon: Clock,
    },
    in_sospeso: {
      label: 'Da recuperare',
      cls: 'bg-warning/20 text-warning border-warning/30',
      Icon: Clock,
    },
    futuro: {
      label: 'In programma',
      cls: 'bg-app-muted/30 text-app-muted-foreground border-app-border',
      Icon: Circle,
    },
  };
  const { label, cls, Icon } = map[variant];
  return (
    <Badge
      variant="outline"
      className={cn('text-[10px] gap-1 font-medium', cls)}
    >
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

export function AtletaProgrammaPage() {
  const { user } = useAuth();
  const { ptName, canAccessWorkouts, isLoading: statusLoading } = useAtletaStatus();

  const { data, isLoading } = useQuery({
    queryKey: ['atleta-programma-attivo', user?.id],
    queryFn: () => (user?.id ? getAtletaActiveProgram(user.id) : Promise.resolve(null)),
    enabled: !!user?.id && canAccessWorkouts,
  });

  // Raggruppa workouts per settimana relativa a start_date
  const weeks = useMemo(() => {
    if (!data) return [];
    const start = parseISO(data.assignment.start_date);
    const startWeek = startOfWeek(start, { weekStartsOn: 1 });
    const map = new Map<number, AtletaProgramWorkout[]>();
    for (const w of data.workouts) {
      if (!w.scheduled_date) continue;
      const d = parseISO(w.scheduled_date);
      const wkIdx = differenceInCalendarWeeks(d, startWeek, { weekStartsOn: 1 });
      const list = map.get(wkIdx) ?? [];
      list.push(w);
      map.set(wkIdx, list);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a - b)
      .map(([weekIdx, workouts]) => ({ weekIdx, workouts }));
  }, [data]);

  // Statistiche progresso
  const progressStats = useMemo(() => {
    if (!data) return null;
    const total = data.workouts.length;
    const completed = data.workouts.filter((w) => w.status === 'completato').length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Prossima sessione = primo workout futuro non completato/saltato
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = data.workouts
      .filter((w) => {
        if (!w.scheduled_date) return false;
        if (w.status === 'completato' || w.status === 'saltato') return false;
        const d = parseISO(w.scheduled_date);
        return d >= today;
      })
      .sort(
        (a, b) =>
          parseISO(a.scheduled_date!).getTime() - parseISO(b.scheduled_date!).getTime(),
      )[0];

    // Settimana corrente
    const start = parseISO(data.assignment.start_date);
    const startWeek = startOfWeek(start, { weekStartsOn: 1 });
    const currentWeek = Math.max(
      1,
      Math.min(
        data.program.duration_weeks,
        differenceInCalendarWeeks(today, startWeek, { weekStartsOn: 1 }) + 1,
      ),
    );

    return { total, completed, percent, upcoming, currentWeek };
  }, [data]);

  // Locked
  if (!statusLoading && !canAccessWorkouts) {
    return (
      <div className="p-4 space-y-6 bg-app-background min-h-screen">
        <h1 className="text-2xl font-bold text-app-foreground pt-2">Programma</h1>
        <Card className="border-dashed bg-app-card border-app-border">
          <CardContent className="p-8 text-center">
            <Lock className="h-12 w-12 mx-auto text-app-muted-foreground mb-4" />
            <h3 className="font-semibold text-app-foreground mb-2">
              Nessun Coach collegato
            </h3>
            <p className="text-sm text-app-muted-foreground mb-4">
              Collegati a un Coach per ricevere il tuo programma di allenamento.
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
      <div className="p-4 space-y-1">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-app-accent" />
          <h1 className="text-2xl font-bold text-app-foreground">Programma</h1>
        </div>
        {ptName && (
          <p className="text-sm text-app-muted-foreground">Coach: {ptName}</p>
        )}
      </div>

      {isLoading ? (
        <div className="px-4">
          <ListSkeleton count={4} type="workout" />
        </div>
      ) : !data ? (
        <div className="px-4">
          <Card className="border-dashed bg-app-card border-app-border">
            <CardContent className="p-8 text-center">
              <CalendarDays className="h-10 w-10 mx-auto text-app-muted-foreground mb-3" />
              <h3 className="font-semibold text-app-foreground mb-1">
                Nessun programma attivo
              </h3>
              <p className="text-sm text-app-muted-foreground mb-4">
                Il tuo Coach non ti ha ancora assegnato un programma di
                allenamento.
              </p>
              <Button
                className="bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
                asChild
              >
                <Link to="/app/esercizi">Vai agli esercizi</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="px-4 space-y-4">
          {/* Header programma */}
          <Card className="bg-app-card border-app-border">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold text-app-foreground">
                  {data.program.name}
                </h2>
                <Badge className="bg-app-accent/20 text-app-accent border-0">
                  {data.program.mode === 'day_by_day' ? 'Day by Day' : 'Ricorrente'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.program.description && (
                <p className="text-sm text-app-foreground/80">
                  {data.program.description}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-app-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {format(parseISO(data.assignment.start_date), 'd MMM yyyy', {
                  locale: it,
                })}
                {' → '}
                {data.assignment.end_date
                  ? format(parseISO(data.assignment.end_date), 'd MMM yyyy', {
                      locale: it,
                    })
                  : `${data.program.duration_weeks} settimane`}
              </div>
              {data.program.mode === 'recurring' && data.assignment.active_days?.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-xs text-app-muted-foreground mr-1">Giorni:</span>
                  {data.assignment.active_days.map((d) => (
                    <Badge
                      key={d}
                      variant="outline"
                      className="text-[10px] border-app-border text-app-foreground"
                    >
                      {DAY_LABELS[d]}
                    </Badge>
                  ))}
                  <span className="text-xs text-app-muted-foreground ml-1">
                    · {data.program.frequency_per_week}x/sett
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card Progresso Programma */}
          {progressStats && (
            <Card className="bg-gradient-to-br from-app-accent/15 via-app-accent/5 to-transparent border-app-accent/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {progressStats.percent === 100 ? (
                      <Trophy className="h-5 w-5 text-app-accent" />
                    ) : (
                      <Flame className="h-5 w-5 text-app-accent" />
                    )}
                    <div>
                      <p className="text-xs text-app-muted-foreground">
                        {progressStats.percent === 100
                          ? 'Programma completato!'
                          : `Settimana ${progressStats.currentWeek} di ${data.program.duration_weeks}`}
                      </p>
                      <p className="text-lg font-bold text-app-foreground leading-none">
                        {progressStats.completed}
                        <span className="text-sm text-app-muted-foreground font-normal">
                          /{progressStats.total} sessioni
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-app-accent leading-none">
                      {progressStats.percent}%
                    </p>
                    <p className="text-[10px] text-app-muted-foreground">completato</p>
                  </div>
                </div>
                <Progress value={progressStats.percent} className="h-2" />

                {progressStats.upcoming && (
                  <Link to={`/app/workout/${progressStats.upcoming.id}`} className="block">
                    <div className="flex items-center gap-3 rounded-lg bg-app-card border border-app-border p-3 hover:border-app-accent/40 transition-colors">
                      <div className="h-10 w-10 rounded-lg bg-app-accent/20 flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-5 w-5 text-app-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-app-muted-foreground">
                          {progressStats.upcoming.scheduled_date &&
                          isToday(parseISO(progressStats.upcoming.scheduled_date))
                            ? 'Oggi'
                            : 'Prossima sessione'}
                        </p>
                        <p className="text-sm font-semibold text-app-foreground truncate">
                          {progressStats.upcoming.title}
                        </p>
                        <p className="text-xs text-app-muted-foreground capitalize">
                          {progressStats.upcoming.scheduled_date
                            ? format(parseISO(progressStats.upcoming.scheduled_date), 'EEEE d MMM', {
                                locale: it,
                              })
                            : ''}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-app-muted-foreground flex-shrink-0" />
                    </div>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          {/* Lista per settimana */}
          {weeks.length === 0 ? (
            <Card className="border-dashed bg-app-card border-app-border">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-app-muted-foreground">
                  Nessun allenamento generato per questo programma.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {weeks.map(({ weekIdx, workouts }) => (
                <div key={weekIdx} className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-app-muted-foreground px-1">
                    Settimana {weekIdx + 1}
                  </h3>
                  <div className="space-y-2">
                    {workouts.map((w) => {
                      const variant = mapStatus(w.status, w.scheduled_date);
                      const isWorkoutToday =
                        w.scheduled_date && isToday(parseISO(w.scheduled_date));
                      return (
                        <Link
                          key={w.id}
                          to={`/app/workout/${w.id}`}
                          className="block"
                        >
                          <Card
                            className={cn(
                              'bg-app-card border-app-border hover:border-app-accent/40 transition-colors',
                              isWorkoutToday &&
                                'border-app-accent ring-1 ring-app-accent/30 bg-app-accent/5',
                            )}
                          >
                            <CardContent className="p-3 flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-app-muted-foreground capitalize flex items-center gap-1.5">
                                  {w.scheduled_date
                                    ? format(
                                        parseISO(w.scheduled_date),
                                        'EEEE d MMM',
                                        { locale: it },
                                      )
                                    : '—'}
                                  {isWorkoutToday && (
                                    <Badge className="bg-app-accent text-app-accent-foreground border-0 text-[9px] h-4 px-1.5">
                                      OGGI
                                    </Badge>
                                  )}
                                </p>
                                <p className="font-semibold text-app-foreground truncate">
                                  {w.title}
                                </p>
                                <div className="mt-1">
                                  <StatusBadge variant={variant} />
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-app-muted-foreground flex-shrink-0" />
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AtletaProgrammaPage;
