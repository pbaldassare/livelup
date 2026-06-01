import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CalendarCheck, CheckCircle2, Clock, AlertTriangle, Dumbbell } from 'lucide-react';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

type WorkoutStatus = 'attivo' | 'in_corso' | 'completato' | 'saltato';

interface TodayRow {
  id: string;
  title: string;
  status: WorkoutStatus;
  atleta_user_id: string;
  athlete_name: string;
  athlete_email: string | null;
  ko_count: number;
}

const STATUS_ORDER: Record<string, number> = {
  completato: 0,
  in_corso: 1,
  attivo: 2,
  saltato: 3,
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  completato: { label: 'Completato', className: 'bg-success/10 text-success border-success/20' },
  in_corso: { label: 'In corso', className: 'bg-info/10 text-info border-info/20' },
  attivo: { label: 'Assegnato', className: 'bg-muted text-muted-foreground border-border' },
  saltato: { label: 'Saltato', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

function todayISO(): string {
  // Local date YYYY-MM-DD (date column doesn't carry tz)
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function PTTodayReport() {
  const { user } = useAuth();
  const today = todayISO();

  const { data: rows, isLoading } = useQuery({
    queryKey: ['pt-today-report', user?.id, today],
    queryFn: async (): Promise<TodayRow[]> => {
      if (!user?.id) return [];

      const { data: workouts, error } = await supabase
        .from('workouts')
        .select('id, title, status, atleta_user_id')
        .eq('pt_user_id', user.id)
        .eq('scheduled_date', today);

      if (error) throw error;
      const list = workouts || [];
      if (list.length === 0) return [];

      const athleteIds = Array.from(new Set(list.map((w) => w.atleta_user_id)));
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', athleteIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p]),
      );

      // For completed workouts, count "ko" sets — interpreted as logged sets
      // marked is_completed = false (failed attempts).
      const completedIds = list.filter((w) => w.status === 'completato').map((w) => w.id);
      const koCounts = new Map<string, number>();

      if (completedIds.length > 0) {
        const { data: exs } = await supabase
          .from('workout_exercises')
          .select('id, workout_id')
          .in('workout_id', completedIds);

        const exToWorkout = new Map<string, string>(
          (exs || []).map((e: any) => [e.id, e.workout_id]),
        );
        const exIds = (exs || []).map((e: any) => e.id);

        if (exIds.length > 0) {
          const { data: logs } = await supabase
            .from('workout_logs')
            .select('workout_exercise_id, is_completed')
            .in('workout_exercise_id', exIds)
            .eq('is_completed', false);

          (logs || []).forEach((l: any) => {
            const wId = exToWorkout.get(l.workout_exercise_id);
            if (!wId) return;
            koCounts.set(wId, (koCounts.get(wId) || 0) + 1);
          });
        }
      }

      const enriched: TodayRow[] = list.map((w) => {
        const p = profileMap.get(w.atleta_user_id) as any;
        const fullName = [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim();
        return {
          id: w.id,
          title: w.title || 'Allenamento',
          status: w.status as WorkoutStatus,
          atleta_user_id: w.atleta_user_id,
          athlete_name: fullName || p?.email || 'Atleta',
          athlete_email: p?.email || null,
          ko_count: koCounts.get(w.id) || 0,
        };
      });

      enriched.sort((a, b) => {
        const sa = STATUS_ORDER[a.status] ?? 99;
        const sb = STATUS_ORDER[b.status] ?? 99;
        if (sa !== sb) return sa - sb;
        return a.athlete_name.localeCompare(b.athlete_name);
      });

      return enriched;
    },
    enabled: !!user?.id,
  });

  const total = rows?.length ?? 0;
  const completed = rows?.filter((r) => r.status === 'completato').length ?? 0;

  return (
    <SectionCard
      title="Report di oggi"
      subtitle={
        total === 0
          ? 'Allenamenti programmati per oggi'
          : `${total} ${total === 1 ? 'allenamento' : 'allenamenti'} oggi — ${completed} completati`
      }
      icon={CalendarCheck}
      iconColor="primary"
    >
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Dumbbell className="h-10 w-10 mb-3 opacity-50" />
          <p className="text-sm">Nessun allenamento programmato per oggi</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows!.map((r) => {
            const meta = STATUS_META[r.status] || STATUS_META.attivo;
            const Icon =
              r.status === 'completato' ? CheckCircle2 : r.status === 'in_corso' ? Clock : Dumbbell;
            return (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full shrink-0',
                      r.status === 'completato' && 'bg-success/10 text-success',
                      r.status === 'in_corso' && 'bg-info/10 text-info',
                      (r.status === 'attivo' || r.status === 'saltato') && 'bg-primary/10 text-primary',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{r.athlete_name}</p>
                    <p className="text-sm text-muted-foreground truncate">{r.title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.status === 'completato' && r.ko_count > 0 && (
                    <Badge
                      variant="outline"
                      className="bg-destructive/10 text-destructive border-destructive/30"
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {r.ko_count} ko
                    </Badge>
                  )}
                  <Badge variant="outline" className={meta.className}>
                    {meta.label}
                  </Badge>
                  <Button asChild variant="ghost" size="sm">
                    <Link to={`/pt/athletes/${r.atleta_user_id}`}>Apri</Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

export default PTTodayReport;
