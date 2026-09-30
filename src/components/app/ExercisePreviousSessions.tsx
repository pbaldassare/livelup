// =====================================================
// "Le ultime volte": come è andato lo stesso esercizio
// nelle schede completate precedenti dell'atleta.
// =====================================================

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  findSetLog,
  formatSessionSummary,
  formatSetValue,
  toPreviousSessions,
  type PreviousLog,
} from '@/lib/exerciseHistory';

async function fetchPreviousSessions(workoutId: string, exerciseId: string) {
  const { data: current, error: currentErr } = await supabase
    .from('workouts')
    .select('atleta_user_id')
    .eq('id', workoutId)
    .maybeSingle();
  if (currentErr) throw currentErr;
  if (!current?.atleta_user_id) return [];

  const { data, error } = await supabase
    .from('workouts')
    .select(
      `id, title, completed_at,
      workout_exercises!inner (
        exercise_id,
        workout_logs (*)
      )`,
    )
    .eq('atleta_user_id', current.atleta_user_id)
    .eq('status', 'completato')
    .neq('id', workoutId)
    .eq('workout_exercises.exercise_id', exerciseId)
    .order('completed_at', { ascending: false, nullsFirst: false })
    .limit(10);
  if (error) throw error;

  return toPreviousSessions(
    (data ?? []) as unknown as Parameters<typeof toPreviousSessions>[0],
    3,
  );
}

export function ExercisePreviousSessions({
  workoutId,
  exerciseId,
  setNumber,
}: {
  workoutId: string;
  exerciseId: string | null | undefined;
  setNumber: number;
}) {
  const { data: sessions = [] } = useQuery({
    queryKey: ['exercise-previous-sessions', workoutId, exerciseId],
    queryFn: () => fetchPreviousSessions(workoutId, exerciseId!),
    enabled: !!workoutId && !!exerciseId,
    staleTime: 5 * 60_000,
  });

  if (sessions.length === 0) return null;

  const lastSet = findSetLog(sessions[0].logs as PreviousLog[], setNumber);

  return (
    <div className="w-full max-w-xs mt-5 rounded-xl border border-app-border bg-app-card/60 px-4 py-3 text-left">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-app-muted-foreground mb-2">
        <History className="h-3.5 w-3.5" />
        Le ultime volte
      </p>
      {lastSet && (
        <p className="text-sm text-app-foreground mb-2">
          Serie {setNumber} la volta scorsa:{' '}
          <span className="font-semibold text-app-accent">{formatSetValue(lastSet)}</span>
        </p>
      )}
      <ul className="space-y-1">
        {sessions.map((s) => (
          <li key={s.workoutId} className="flex items-baseline gap-2 text-xs">
            <span className="shrink-0 w-14 text-app-muted-foreground tabular-nums">
              {s.completedAt ? format(new Date(s.completedAt), 'd MMM', { locale: it }) : '—'}
            </span>
            <span className="text-app-foreground tabular-nums">{formatSessionSummary(s.logs)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
