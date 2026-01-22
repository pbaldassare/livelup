import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// EXERCISE HISTORY - Storico esercizio con stats
// Design reference: Ladder_iOS_167.png
// =====================================================

interface ExerciseLog {
  date: string;
  equipment: string;
  time: string;
  effort: string;
  reps: number;
  weight: string;
  oneRM?: string;
}

interface ExerciseStats {
  totalVolume: string;
  totalReps: number;
  avgWeight: string;
  maxWeight: string;
}

interface ExerciseHistoryProps {
  exerciseName: string;
  equipmentFilters: string[];
  stats: ExerciseStats;
  history: ExerciseLog[];
  onBack: () => void;
}

export function ExerciseHistory({
  exerciseName,
  equipmentFilters,
  stats,
  history,
  onBack,
}: ExerciseHistoryProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filteredHistory = activeFilter
    ? history.filter(h => h.equipment.toLowerCase() === activeFilter.toLowerCase())
    : history;

  const filterCounts = equipmentFilters.reduce((acc, filter) => {
    acc[filter] = history.filter(h => h.equipment.toLowerCase() === filter.toLowerCase()).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-app-background text-app-foreground">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="text-app-foreground hover:bg-app-muted"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <h1 className="text-lg font-semibold">{exerciseName}</h1>

        <Button
          variant="ghost"
          size="icon"
          className="text-app-foreground hover:bg-app-muted"
        >
          <MoreHorizontal className="h-6 w-6" />
        </Button>
      </div>

      {/* Equipment filters */}
      <div className="flex gap-2 px-4 pb-4 overflow-x-auto">
        <button
          onClick={() => setActiveFilter(null)}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
            activeFilter === null
              ? 'bg-app-accent text-app-accent-foreground'
              : 'bg-app-muted text-app-foreground border border-app-border'
          )}
        >
          All ({history.length})
        </button>
        {equipmentFilters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(activeFilter === filter ? null : filter)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              activeFilter === filter
                ? 'bg-app-accent text-app-accent-foreground'
                : 'bg-app-muted text-app-foreground border border-app-border'
            )}
          >
            {filter} ({filterCounts[filter] || 0})
          </button>
        ))}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2 px-4 mb-6">
        {[
          { value: stats.totalVolume, label: 'Total Volume' },
          { value: stats.totalReps.toString(), label: 'Total Reps' },
          { value: stats.avgWeight, label: 'Avg Weight' },
          { value: stats.maxWeight, label: 'Max Weight' },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-app-muted border border-app-border rounded-lg p-3 text-center"
          >
            <p className="text-lg font-bold text-app-foreground">{stat.value}</p>
            <p className="text-xs text-app-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* History section */}
      <div className="px-4">
        <h2 className="text-xl font-bold mb-4">History</h2>

        {/* Table header */}
        <div className="grid grid-cols-7 gap-2 text-xs text-app-muted-foreground pb-2 border-b border-app-border">
          <span>Date</span>
          <span>Equipment</span>
          <span>Time</span>
          <span>Effort</span>
          <span>Reps</span>
          <span>Wt</span>
          <span>1RM</span>
        </div>

        {/* Table rows */}
        <div className="divide-y divide-app-border">
          {filteredHistory.map((log, i) => (
            <div key={i} className="grid grid-cols-7 gap-2 py-3 text-sm items-center">
              <span className="text-app-foreground">{log.date}</span>
              <span className="text-app-foreground">{log.equipment}</span>
              <span className="text-app-foreground">{log.time}</span>
              <span className="text-app-accent font-medium">{log.effort}</span>
              <span className="text-app-foreground">{log.reps}</span>
              <span className="text-app-muted-foreground">{log.weight}</span>
              <span className="text-app-muted-foreground">{log.oneRM || '--'}</span>
            </div>
          ))}
        </div>

        {filteredHistory.length === 0 && (
          <div className="py-8 text-center text-app-muted-foreground">
            Nessun log per questo filtro
          </div>
        )}
      </div>
    </div>
  );
}

export default ExerciseHistory;
