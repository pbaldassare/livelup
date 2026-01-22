import { cn } from '@/lib/utils';

// =====================================================
// BADGE CARD - Badge display with progress
// Design reference: Ladder_iOS_118.png
// =====================================================

interface BadgeCardProps {
  name: string;
  value: string | number;
  iconUrl?: string;
  variant?: 'large' | 'small';
  progress?: {
    current: number;
    max: number;
  };
  className?: string;
}

export function BadgeCard({
  name,
  value,
  iconUrl,
  variant = 'small',
  progress,
  className,
}: BadgeCardProps) {
  const progressPercent = progress 
    ? (progress.current / progress.max) * 100 
    : 0;

  if (variant === 'large') {
    return (
      <div className={cn('flex flex-col items-center py-6', className)}>
        {/* Large badge circle */}
        <div className="relative w-48 h-48">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-8 border-gray-600 bg-gradient-to-b from-gray-400 to-gray-600 shadow-xl" />
          
          {/* Inner content */}
          <div className="absolute inset-4 rounded-full bg-app-background flex flex-col items-center justify-center border-2 border-gray-500">
            <span className="text-xs text-app-muted-foreground uppercase tracking-wider">LADDER</span>
            <span className="text-5xl font-bold text-app-foreground">{value}</span>
          </div>
          
          {/* Progress ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              fill="none"
              strokeWidth="8"
              stroke="hsl(var(--app-accent))"
              strokeDasharray={`${progressPercent * 2.83} 283`}
              className="transition-all duration-700"
            />
          </svg>
        </div>

        {/* Progress bar */}
        {progress && (
          <div className="w-full max-w-xs mt-6 px-4">
            <div className="flex justify-between text-sm text-app-foreground mb-2">
              <span>{progress.current}</span>
              <span>{progress.max}</span>
            </div>
            <div className="h-2 bg-app-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-app-foreground rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {/* Small badge icon */}
      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-app-muted to-app-background flex items-center justify-center mb-2 overflow-hidden">
        {iconUrl ? (
          <img src={iconUrl} alt={name} className="w-16 h-16 object-contain" />
        ) : (
          <div className="w-16 h-16 bg-app-muted rounded-xl flex items-center justify-center">
            <span className="text-2xl font-bold text-app-accent">{value}</span>
          </div>
        )}
      </div>
      
      <span className="text-xs text-app-foreground text-center">{name}</span>
      <span className="text-xs text-app-muted-foreground bg-app-muted px-2 py-0.5 rounded-full mt-1">
        {value}
      </span>
    </div>
  );
}

export default BadgeCard;
