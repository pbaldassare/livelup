import {
  UserCardSkeleton,
  PTCardSkeleton,
  WorkoutCardSkeleton,
  ChatCardSkeleton,
  KPICardSkeleton,
  EventCardSkeleton,
  StatsCardSkeleton,
} from "./CardSkeleton";

type SkeletonType = 'user' | 'pt' | 'workout' | 'chat' | 'kpi' | 'event' | 'stats';

interface ListSkeletonProps {
  count?: number;
  type: SkeletonType;
  variant?: 'pulse' | 'shimmer';
  className?: string;
}

const skeletonMap = {
  user: UserCardSkeleton,
  pt: PTCardSkeleton,
  workout: WorkoutCardSkeleton,
  chat: ChatCardSkeleton,
  kpi: KPICardSkeleton,
  event: EventCardSkeleton,
  stats: StatsCardSkeleton,
};

export function ListSkeleton({ 
  count = 3, 
  type, 
  variant = 'shimmer',
  className = '' 
}: ListSkeletonProps) {
  const SkeletonComponent = skeletonMap[type];

  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonComponent key={i} variant={variant} />
      ))}
    </div>
  );
}

// Grid variant per KPI cards
interface GridSkeletonProps {
  count?: number;
  type: SkeletonType;
  variant?: 'pulse' | 'shimmer';
  columns?: 2 | 3 | 4;
}

export function GridSkeleton({ 
  count = 4, 
  type, 
  variant = 'shimmer',
  columns = 4 
}: GridSkeletonProps) {
  const SkeletonComponent = skeletonMap[type];

  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid gap-4 ${gridCols[columns]}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonComponent key={i} variant={variant} />
      ))}
    </div>
  );
}
