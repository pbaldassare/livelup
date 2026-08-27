import { addDays, differenceInCalendarDays } from 'date-fns';

export type WorkoutRepetitionMode = 'once' | 'total' | 'weekly_count';

export const MAX_WORKOUT_OCCURRENCES = 60;
const DEFAULT_WEEKS_WITHOUT_END = 8;

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function uniqueSorted(dates: Date[]): Date[] {
  const seen = new Set<string>();
  const out: Date[] = [];
  for (const d of dates) {
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }
  return out;
}

/** Genera le date di assegnazione per volte totali o volte/settimana, senza giorni fissi. */
export function generateWorkoutRepetitionDates(params: {
  mode: WorkoutRepetitionMode;
  startDate: Date;
  endDate?: Date | null;
  totalCount?: number;
  timesPerWeek?: number;
}): Date[] {
  const start = startOfLocalDay(params.startDate);
  const stop = params.endDate ? startOfLocalDay(params.endDate) : null;
  if (stop && stop < start) return [start];

  if (params.mode === 'once') return [start];

  if (params.mode === 'total') {
    const n = Math.min(
      MAX_WORKOUT_OCCURRENCES,
      Math.max(1, Math.floor(params.totalCount ?? 1)),
    );
    if (n === 1) return [start];
    if (stop) {
      const span = differenceInCalendarDays(stop, start);
      const dates: Date[] = [];
      for (let i = 0; i < n; i++) {
        const offset = Math.round((span * i) / (n - 1));
        dates.push(addDays(start, offset));
      }
      return uniqueSorted(dates);
    }
    return Array.from({ length: n }, (_, i) => addDays(start, i));
  }

  const perWeek = Math.min(7, Math.max(1, Math.floor(params.timesPerWeek ?? 3)));
  const step = 7 / perWeek;
  const dates: Date[] = [];
  let week = 0;
  while (dates.length < MAX_WORKOUT_OCCURRENCES) {
    const weekAnchor = addDays(start, week * 7);
    if (stop && weekAnchor > stop) break;
    if (!stop && week >= DEFAULT_WEEKS_WITHOUT_END) break;
    for (let i = 0; i < perWeek; i++) {
      const d = addDays(weekAnchor, Math.round(i * step));
      if (d < start) continue;
      if (stop && d > stop) continue;
      dates.push(d);
      if (dates.length >= MAX_WORKOUT_OCCURRENCES) break;
    }
    week++;
  }
  return uniqueSorted(dates);
}
