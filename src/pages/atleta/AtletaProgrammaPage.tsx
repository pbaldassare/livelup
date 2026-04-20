import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format, parseISO, startOfWeek, differenceInCalendarWeeks } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
                variant="outline"
                className="border-app-border text-app-foreground"
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
                      return (
                        <Link
                          key={w.id}
                          to={`/app/workout/${w.id}`}
                          className="block"
                        >
                          <Card className="bg-app-card border-app-border hover:border-app-accent/40 transition-colors">
                            <CardContent className="p-3 flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-app-muted-foreground capitalize">
                                  {w.scheduled_date
                                    ? format(
                                        parseISO(w.scheduled_date),
                                        'EEEE d MMM',
                                        { locale: it },
                                      )
                                    : '—'}
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
