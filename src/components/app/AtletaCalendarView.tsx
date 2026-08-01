import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { it } from 'date-fns/locale';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Dumbbell,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useAtletaStatus } from '@/hooks/useAtletaStatus';
import { supabase } from '@/integrations/supabase/client';

// =====================================================
// ATLETA CALENDAR VIEW
// Full calendar with Day / Week / Month modes.
// Dark theme, lime accent (#D4FF00). No external lib.
// =====================================================

type ViewMode = 'day' | 'week' | 'month';

interface WorkoutRow {
  id: string;
  title: string;
  status: 'assegnato' | 'in_corso' | 'completato' | string;
  scheduled_date: string;
  exercise_count: number;
}

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

function statusMeta(status: string) {
  switch (status) {
    case 'completato':
      return {
        label: 'Completato',
        cls: 'bg-success/15 text-success border-success/30',
        Icon: CheckCircle2,
      };
    case 'in_corso':
      return {
        label: 'In corso',
        cls: 'bg-warning/15 text-warning border-warning/30',
        Icon: Clock,
      };
    default:
      return {
        label: 'Assegnato',
        cls: 'bg-app-muted/40 text-app-muted-foreground border-app-border',
        Icon: Circle,
      };
  }
}

function rangeKey(from: Date, to: Date) {
  return `${ymd(from)}_${ymd(to)}`;
}

async function fetchWorkoutsInRange(
  userId: string,
  from: Date,
  to: Date,
): Promise<WorkoutRow[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('id, title, status, scheduled_date, workout_exercises(id)')
    .eq('atleta_user_id', userId)
    .gte('scheduled_date', ymd(from))
    .lte('scheduled_date', ymd(to))
    .order('scheduled_date', { ascending: true });

  if (error) throw error;

  return (data ?? [])
    .filter((w: any) => !!w.scheduled_date)
    .map((w: any) => ({
      id: w.id,
      title: w.title,
      status: w.status,
      scheduled_date: w.scheduled_date,
      exercise_count: Array.isArray(w.workout_exercises)
        ? w.workout_exercises.length
        : 0,
    }));
}

export function AtletaCalendarView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { canAccessWorkouts } = useAtletaStatus();

  const [view, setView] = useState<ViewMode>('day');
  const [selected, setSelected] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Compute query range based on current view
  const range = useMemo(() => {
    if (view === 'day') {
      return { from: selected, to: selected };
    }
    if (view === 'week') {
      return {
        from: startOfWeek(selected, { weekStartsOn: 1 }),
        to: endOfWeek(selected, { weekStartsOn: 1 }),
      };
    }
    // month: include leading/trailing days of the grid
    const monthStart = startOfMonth(selected);
    const monthEnd = endOfMonth(selected);
    return {
      from: startOfWeek(monthStart, { weekStartsOn: 1 }),
      to: endOfWeek(monthEnd, { weekStartsOn: 1 }),
    };
  }, [view, selected]);

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: [
      'atleta-calendar-workouts',
      user?.id,
      rangeKey(range.from, range.to),
    ],
    queryFn: () =>
      user?.id
        ? fetchWorkoutsInRange(user.id, range.from, range.to)
        : Promise.resolve([]),
    enabled: !!user?.id && canAccessWorkouts,
  });

  const byDate = useMemo(() => {
    const m = new Map<string, WorkoutRow[]>();
    for (const w of workouts) {
      const k = w.scheduled_date;
      const arr = m.get(k) ?? [];
      arr.push(w);
      m.set(k, arr);
    }
    return m;
  }, [workouts]);

  const goPrev = () => {
    if (view === 'day') setSelected((d) => addDays(d, -1));
    else if (view === 'week') setSelected((d) => addWeeks(d, -1));
    else setSelected((d) => addMonths(d, -1));
  };
  const goNext = () => {
    if (view === 'day') setSelected((d) => addDays(d, 1));
    else if (view === 'week') setSelected((d) => addWeeks(d, 1));
    else setSelected((d) => addMonths(d, 1));
  };
  const goToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setSelected(d);
  };

  const headerLabel = useMemo(() => {
    if (view === 'day') {
      return format(selected, "EEEE d MMMM yyyy", { locale: it });
    }
    if (view === 'week') {
      const ws = startOfWeek(selected, { weekStartsOn: 1 });
      const we = endOfWeek(selected, { weekStartsOn: 1 });
      const sameMonth = ws.getMonth() === we.getMonth();
      return sameMonth
        ? `${format(ws, 'd', { locale: it })} – ${format(we, 'd MMMM yyyy', { locale: it })}`
        : `${format(ws, 'd MMM', { locale: it })} – ${format(we, 'd MMM yyyy', { locale: it })}`;
    }
    return format(selected, 'MMMM yyyy', { locale: it });
  }, [view, selected]);

  return (
    <div className="bg-app-background text-app-foreground pb-2">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-app-accent" />
          <h1 className="text-2xl font-bold">Programma</h1>
        </div>

        {/* View switcher */}
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-app-muted/30 p-1 border border-app-border">
          {(
            [
              { id: 'day', label: 'Giorno' },
              { id: 'week', label: 'Settimana' },
              { id: 'month', label: 'Mese' },
            ] as { id: ViewMode; label: string }[]
          ).map((opt) => {
            const active = view === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setView(opt.id)}
                className={cn(
                  'h-9 rounded-lg text-sm font-semibold transition-colors',
                  active
                    ? 'bg-app-accent text-app-accent-foreground shadow-sm'
                    : 'text-app-muted-foreground hover:text-app-foreground',
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Nav row */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={goPrev}
            aria-label="Precedente"
            className="h-10 w-10 inline-flex items-center justify-center rounded-lg bg-app-muted/30 border border-app-border text-app-foreground hover:border-app-accent/40"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold capitalize">{headerLabel}</p>
          </div>
          <button
            onClick={goNext}
            aria-label="Successivo"
            className="h-10 w-10 inline-flex items-center justify-center rounded-lg bg-app-muted/30 border border-app-border text-app-foreground hover:border-app-accent/40"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={goToday}
            className="h-8 text-xs border-app-border bg-app-card text-app-foreground hover:bg-app-muted/40 hover:text-app-foreground"
          >
            Oggi
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${view}-${ymd(selected)}`}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {view === 'day' && (
              <DayView
                date={selected}
                workouts={byDate.get(ymd(selected)) ?? []}
                isLoading={isLoading}
                onOpenWorkout={(id) => navigate(`/app/workout/${id}`)}
              />
            )}
            {view === 'week' && (
              <WeekView
                anchor={selected}
                byDate={byDate}
                onPickDay={(d) => {
                  setSelected(d);
                  setView('day');
                }}
              />
            )}
            {view === 'month' && (
              <MonthView
                anchor={selected}
                byDate={byDate}
                onPickDay={(d) => {
                  setSelected(d);
                  setView('day');
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------- DAY VIEW ----------
function DayView({
  date,
  workouts,
  isLoading,
  onOpenWorkout,
}: {
  date: Date;
  workouts: WorkoutRow[];
  isLoading: boolean;
  onOpenWorkout: (id: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-24 rounded-xl bg-app-muted/20 border border-app-border animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (workouts.length === 0) {
    return (
      <Card className="border-dashed bg-app-card border-app-border">
        <CardContent className="p-8 text-center">
          <CalendarDays className="h-10 w-10 mx-auto text-app-muted-foreground mb-3" />
          <p className="text-sm text-app-muted-foreground">
            Nessun allenamento per questo giorno
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {workouts.map((w) => {
        const meta = statusMeta(w.status);
        const isCompleted = w.status === 'completato';
        const isInProgress = w.status === 'in_corso';
        const ctaLabel = isCompleted
          ? 'Rivedi'
          : isInProgress
            ? 'Continua'
            : 'Inizia';
        return (
          <Card
            key={w.id}
            onClick={() => onOpenWorkout(w.id)}
            className="cursor-pointer bg-app-card border-app-border hover:border-app-accent/40 transition-colors"
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-wide text-app-muted-foreground capitalize">
                    {format(parseISO(w.scheduled_date), 'EEEE d MMM', { locale: it })}
                  </p>
                  <h3 className="text-base font-semibold text-app-foreground truncate">
                    {w.title}
                  </h3>
                </div>
                <Badge
                  variant="outline"
                  className={cn('text-[10px] gap-1 font-medium', meta.cls)}
                >
                  <meta.Icon className="h-3 w-3" />
                  {meta.label}
                </Badge>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-xs text-app-muted-foreground">
                  <Dumbbell className="h-3.5 w-3.5" />
                  {w.exercise_count} esercizi
                </div>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenWorkout(w.id);
                  }}
                  className="h-8 px-3 bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
                >
                  <Play className="h-3.5 w-3.5 mr-1" />
                  {ctaLabel}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ---------- WEEK VIEW ----------
function WeekView({
  anchor,
  byDate,
  onPickDay,
}: {
  anchor: Date;
  byDate: Map<string, WorkoutRow[]>;
  onPickDay: (d: Date) => void;
}) {
  const ws = startOfWeek(anchor, { weekStartsOn: 1 });
  const days = eachDayOfInterval({
    start: ws,
    end: endOfWeek(anchor, { weekStartsOn: 1 }),
  });

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d) => {
        const items = byDate.get(ymd(d)) ?? [];
        const today = isToday(d);
        const isAnchor = isSameDay(d, anchor);
        return (
          <button
            key={d.toISOString()}
            onClick={() => onPickDay(d)}
            className={cn(
              'flex flex-col items-center rounded-xl border p-2 min-h-[88px] text-center transition-colors',
              'bg-app-card border-app-border hover:border-app-accent/40',
              isAnchor && 'border-app-accent ring-1 ring-app-accent/40',
              today && !isAnchor && 'border-app-accent/40',
            )}
          >
            <span className="text-[10px] uppercase tracking-wide text-app-muted-foreground">
              {format(d, 'EEE', { locale: it })}
            </span>
            <span
              className={cn(
                'mt-1 text-lg font-bold',
                today ? 'text-app-accent' : 'text-app-foreground',
              )}
            >
              {format(d, 'd')}
            </span>
            <div className="mt-1 flex flex-col items-center gap-1">
              {items.length === 0 ? (
                <span className="block h-1.5 w-1.5 rounded-full bg-app-muted/40" />
              ) : (
                <>
                  <span
                    className="block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: '#D4FF00' }}
                  />
                  {items.length > 1 && (
                    <span className="text-[10px] font-semibold text-app-accent">
                      {items.length}
                    </span>
                  )}
                </>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ---------- MONTH VIEW ----------
function MonthView({
  anchor,
  byDate,
  onPickDay,
}: {
  anchor: Date;
  byDate: Map<string, WorkoutRow[]>;
  onPickDay: (d: Date) => void;
}) {
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const weekdayLabels = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1">
        {weekdayLabels.map((l) => (
          <div
            key={l}
            className="text-[10px] uppercase tracking-wide text-app-muted-foreground text-center py-1"
          >
            {l}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const inMonth = isSameMonth(d, anchor);
          const items = byDate.get(ymd(d)) ?? [];
          const today = isToday(d);
          const isAnchor = isSameDay(d, anchor);
          return (
            <button
              key={d.toISOString()}
              onClick={() => onPickDay(d)}
              className={cn(
                'aspect-square rounded-lg border flex flex-col items-center justify-center gap-1 text-sm transition-colors',
                'bg-app-card border-app-border hover:border-app-accent/40',
                !inMonth && 'opacity-40',
                isAnchor && 'border-app-accent ring-1 ring-app-accent/40',
                today && !isAnchor && 'border-app-accent/40',
              )}
            >
              <span
                className={cn(
                  'font-semibold',
                  today ? 'text-app-accent' : 'text-app-foreground',
                )}
              >
                {format(d, 'd')}
              </span>
              {items.length > 0 ? (
                <span
                  className="block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: '#D4FF00' }}
                />
              ) : (
                <span className="block h-1.5 w-1.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default AtletaCalendarView;
