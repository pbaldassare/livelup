import { cn } from '@/lib/utils';

// =====================================================
// PROFILE STATS - Circular progress stats
// Design reference: Ladder_iOS_117.png
// =====================================================

interface StatItem {
  value: string | number;
  label: string;
  color?: 'blue' | 'orange' | 'pink' | 'default';
  progress?: number; // 0-100
}

interface ProfileStatsProps {
  stats: StatItem[];
  className?: string;
}

const colorClasses = {
  blue: 'stroke-blue-400',
  orange: 'stroke-orange-400',
  pink: 'stroke-pink-300',
  default: 'stroke-app-muted-foreground',
};

const bgColorClasses = {
  blue: 'from-blue-500/20 to-blue-400/10',
  orange: 'from-orange-500/20 to-orange-400/10',
  pink: 'from-pink-400/20 to-pink-300/10',
  default: 'from-app-muted to-app-background',
};

function CircularProgress({ 
  value, 
  label, 
  color = 'default',
  progress = 75 
}: StatItem) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20">
        {/* Background circle */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-app-muted/50"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn(colorClasses[color], 'transition-all duration-500')}
          />
        </svg>
        
        {/* Value in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-app-foreground">{value}</span>
        </div>
      </div>
      
      <span className="text-xs text-app-muted-foreground mt-2">{label}</span>
    </div>
  );
}

export function ProfileStats({ stats, className }: ProfileStatsProps) {
  return (
    <div className={cn('flex justify-around py-4 px-2', className)}>
      {stats.map((stat, index) => (
        <CircularProgress key={index} {...stat} />
      ))}
    </div>
  );
}

export default ProfileStats;
