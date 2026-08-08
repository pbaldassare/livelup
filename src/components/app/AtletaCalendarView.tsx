import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  CheckCircle2,
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
import {
  AppCalendarView,
  rangeKey,
  type AppCalendarItem,
  type AppCalendarVisibleRange,
} from '@/components/app/AppCalendarView';

// =====================================================
// ATLETA CALENDAR VIEW
// Thin wrapper: fetches workouts → shared AppCalendarView.
// =====================================================

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
  const [range, setRange] = useState<AppCalendarVisibleRange | null>(null);

  const onVisibleRangeChange = useCallback((next: AppCalendarVisibleRange) => {
    setRange(next);
  }, []);

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: [
      'atleta-calendar-workouts',
      user?.id,
      range ? rangeKey(range.from, range.to) : null,
    ],
    queryFn: () =>
      user?.id && range
        ? fetchWorkoutsInRange(user.id, range.from, range.to)
        : Promise.resolve([]),
    enabled: !!user?.id && canAccessWorkouts && !!range,
  });

  const items: AppCalendarItem[] = workouts.map((w) => ({
    id: w.id,
    title: w.title,
    date: w.scheduled_date,
    status: w.status,
    onClick: () => navigate(`/app/workout/${w.id}`),
  }));

  const openWorkout = (id: string) => navigate(`/app/workout/${id}`);

  return (
    <AppCalendarView
      items={items}
      isLoading={isLoading}
      emptyLabel="Nessun allenamento per questo giorno"
      onVisibleRangeChange={onVisibleRangeChange}
      renderItem={(item) => {
        const w = workouts.find((x) => x.id === item.id);
        if (!w) return null;
        const meta = statusMeta(w.status);
        const isCompleted = w.status === 'completato';
        const isInProgress = w.status === 'in_corso';
        const ctaLabel = isCompleted
          ? 'Rifai'
          : isInProgress
            ? 'Continua'
            : 'Inizia';
        return (
          <Card
            onClick={() => openWorkout(w.id)}
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
                    openWorkout(w.id);
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
      }}
    />
  );
}

export default AtletaCalendarView;
