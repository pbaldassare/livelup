import { useState } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  isToday
} from 'date-fns';
import { it } from 'date-fns/locale';

// =====================================================
// ACTIVITY CALENDAR - Monthly workout calendar
// Design reference: Ladder_iOS_161.png
// =====================================================

interface WorkoutDay {
  date: Date;
  hasWorkout: boolean;
  isCompleted?: boolean;
}

interface WorkoutItem {
  id: string;
  title: string;
  duration: string;
  category: string;
  imageUrl?: string;
  isFeatured?: boolean;
}

interface ActivityCalendarProps {
  workoutDays: WorkoutDay[];
  workoutsForDate: WorkoutItem[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onWorkoutClick: (workoutId: string) => void;
}

export function ActivityCalendar({
  workoutDays,
  workoutsForDate,
  selectedDate,
  onDateSelect,
  onWorkoutClick,
}: ActivityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get day names
  const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Calculate padding for first day (Monday = 0)
  const startDayIndex = (getDay(monthStart) + 6) % 7;
  const paddingDays = Array(startDayIndex).fill(null);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const getDayStatus = (date: Date) => {
    const workoutDay = workoutDays.find(d => isSameDay(d.date, date));
    return {
      hasWorkout: workoutDay?.hasWorkout || false,
      isCompleted: workoutDay?.isCompleted || false,
    };
  };

  return (
    <div className="bg-app-background">
      {/* Section title */}
      <div className="px-4 py-3">
        <h2 className="text-lg font-bold text-app-foreground">Workout Activity</h2>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-center gap-4 px-4 pb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevMonth}
          className="text-app-foreground hover:bg-app-muted"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <span className="text-lg font-semibold text-app-foreground min-w-[140px] text-center">
          {format(currentMonth, 'MMMM yyyy', { locale: it })}
        </span>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextMonth}
          className="text-app-foreground hover:bg-app-muted"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 px-4 mb-2">
        {dayNames.map((day, i) => (
          <div key={i} className="text-center text-xs text-app-muted-foreground py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 px-4 pb-4">
        {/* Padding days */}
        {paddingDays.map((_, i) => (
          <div key={`pad-${i}`} className="aspect-square" />
        ))}

        {/* Month days */}
        {monthDays.map((date) => {
          const { hasWorkout, isCompleted } = getDayStatus(date);
          const isSelected = isSameDay(date, selectedDate);
          const isTodayDate = isToday(date);
          const dayNum = format(date, 'd');
          const isPastMonth = !isSameMonth(date, currentMonth);

          return (
            <button
              key={date.toISOString()}
              onClick={() => onDateSelect(date)}
              className={cn(
                'aspect-square flex items-center justify-center rounded-full text-sm font-medium transition-all',
                isPastMonth && 'text-app-muted-foreground/50',
                !isPastMonth && 'text-app-foreground',
                isTodayDate && !isSelected && 'ring-2 ring-app-accent',
                isSelected && 'bg-app-accent text-app-accent-foreground',
                hasWorkout && !isSelected && 'text-app-accent',
                isCompleted && !isSelected && 'bg-app-accent/20'
              )}
            >
              {dayNum}
            </button>
          );
        })}
      </div>

      {/* Workouts for selected date */}
      <div className="px-4 pb-4">
        <h3 className="text-lg font-bold text-app-foreground mb-3">Workouts</h3>

        {workoutsForDate.length > 0 ? (
          <div className="space-y-3">
            {workoutsForDate.map((workout) => (
              <button
                key={workout.id}
                onClick={() => onWorkoutClick(workout.id)}
                className="w-full flex items-center gap-3 p-3 bg-app-muted rounded-xl hover:bg-app-muted/80 transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-20 h-20 rounded-lg bg-app-background overflow-hidden flex-shrink-0">
                  {workout.imageUrl ? (
                    <img 
                      src={workout.imageUrl} 
                      alt={workout.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-app-muted-foreground">
                      🏋️
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-1.5">
                    {workout.isFeatured && (
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    )}
                    <h4 className="font-semibold text-app-foreground">{workout.title}</h4>
                  </div>
                  <p className="text-sm text-app-muted-foreground">
                    {workout.duration} • {workout.category}
                  </p>
                </div>

                <ChevronRight className="h-5 w-5 text-app-muted-foreground" />
              </button>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-app-muted-foreground">
            Nessun allenamento per questa data
          </div>
        )}
      </div>
    </div>
  );
}

export default ActivityCalendar;
