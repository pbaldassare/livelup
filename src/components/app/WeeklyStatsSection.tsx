import { cn } from '@/lib/utils';
import { Flame, Target, Trophy } from 'lucide-react';

// =====================================================
// WEEKLY STATS SECTION - Statistiche settimanali atleta
// Design: dark theme cards con icone e progress
// =====================================================

interface WeeklyStatsSectionProps {
  completedThisWeek: number;
  currentStreak: number;
  totalCompleted: number;
  className?: string;
}

export function WeeklyStatsSection({
  completedThisWeek,
  currentStreak,
  totalCompleted,
  className,
}: WeeklyStatsSectionProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-bold text-white uppercase tracking-wide">
        Le tue statistiche
      </h3>
      
      <div className="grid grid-cols-3 gap-3">
        {/* Completed This Week */}
        <div className="bg-gray-900/60 rounded-xl p-4 text-center border border-white/10">
          <div className="flex justify-center mb-2">
            <div className="w-10 h-10 rounded-full bg-app-accent/20 flex items-center justify-center">
              <Target className="h-5 w-5 text-app-accent" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{completedThisWeek}</p>
          <p className="text-[10px] text-white/50 uppercase">Questa settimana</p>
        </div>

        {/* Current Streak */}
        <div className="bg-gray-900/60 rounded-xl p-4 text-center border border-white/10">
          <div className="flex justify-center mb-2">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <Flame className="h-5 w-5 text-orange-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{currentStreak}</p>
          <p className="text-[10px] text-white/50 uppercase">
            {currentStreak === 1 ? 'Settimana' : 'Settimane'} streak
          </p>
        </div>

        {/* Total Completed */}
        <div className="bg-gray-900/60 rounded-xl p-4 text-center border border-white/10">
          <div className="flex justify-center mb-2">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-purple-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{totalCompleted}</p>
          <p className="text-[10px] text-white/50 uppercase">Totali</p>
        </div>
      </div>
    </div>
  );
}

export default WeeklyStatsSection;
