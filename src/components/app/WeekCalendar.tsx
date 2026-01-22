import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

// =====================================================
// WEEK CALENDAR - Calendario settimanale con checkmark
// Design: giorni con ring, checkmark per completati
// =====================================================

interface DayStatus {
  day: string;
  date: number;
  isCompleted: boolean;
  isToday: boolean;
  isFuture: boolean;
}

interface WeekCalendarProps {
  days: DayStatus[];
  className?: string;
}

const defaultDays: DayStatus[] = [
  { day: 'L', date: 1, isCompleted: true, isToday: false, isFuture: false },
  { day: 'M', date: 2, isCompleted: true, isToday: false, isFuture: false },
  { day: 'M', date: 3, isCompleted: true, isToday: false, isFuture: false },
  { day: 'G', date: 4, isCompleted: false, isToday: true, isFuture: false },
  { day: 'V', date: 5, isCompleted: false, isToday: false, isFuture: true },
  { day: 'S', date: 6, isCompleted: false, isToday: false, isFuture: true },
  { day: 'D', date: 7, isCompleted: false, isToday: false, isFuture: true },
];

export function WeekCalendar({ days = defaultDays, className }: WeekCalendarProps) {
  return (
    <div className={cn('flex items-center justify-between gap-2 px-4', className)}>
      {days.map((day, index) => (
        <div 
          key={index}
          className="flex flex-col items-center gap-1"
        >
          <span className={cn(
            'text-xs font-medium',
            day.isToday ? 'text-app-accent' : 'text-white/60'
          )}>
            {day.day}
          </span>
          <div className={cn(
            'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
            day.isCompleted && 'bg-app-accent border-app-accent',
            day.isToday && !day.isCompleted && 'border-app-accent',
            !day.isCompleted && !day.isToday && 'border-white/20',
            day.isFuture && 'opacity-50'
          )}>
            {day.isCompleted ? (
              <Check className="h-5 w-5 text-black" strokeWidth={3} />
            ) : (
              <span className={cn(
                'text-sm font-bold',
                day.isToday ? 'text-app-accent' : 'text-white/40'
              )}>
                {day.date}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default WeekCalendar;
