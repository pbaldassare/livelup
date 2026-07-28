import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface BadgeCardProps {
  name: string;
  description?: string;
  emoji?: string;
  earned?: boolean;
  earnedAt?: string;
  points?: number;
  variant?: 'large' | 'small';
  progress?: {
    current: number;
    max: number;
  };
  className?: string;
}

export function BadgeCard({
  name,
  description,
  emoji,
  earned = true,
  earnedAt,
  points,
  variant = 'small',
  progress,
  className,
}: BadgeCardProps) {
  const progressPercent = progress 
    ? Math.min((progress.current / progress.max) * 100, 100) 
    : 0;

  if (variant === 'large') {
    return (
      <div className={cn('flex flex-col items-center py-6', className)}>
        <div className="relative w-40 h-40">
          {/* Background ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="46%"
              fill="none"
              strokeWidth="6"
              className="stroke-app-border"
            />
            <circle
              cx="50%"
              cy="50%"
              r="46%"
              fill="none"
              strokeWidth="6"
              className="stroke-app-accent"
              strokeLinecap="round"
              strokeDasharray={`${progressPercent * 2.89} 289`}
              style={{ transition: 'stroke-dasharray 0.7s ease' }}
            />
          </svg>
          
          {/* Inner content */}
          <div className="absolute inset-4 rounded-full bg-app-card flex flex-col items-center justify-center">
            {emoji && <span className="text-4xl mb-1">{emoji}</span>}
            {progress && (
              <span className="text-2xl font-bold text-app-foreground">
                {progress.current}/{progress.max}
              </span>
            )}
          </div>
        </div>

        <h3 className="text-base font-semibold text-app-foreground mt-4">{name}</h3>
        {description && (
          <p className="text-sm text-app-muted-foreground mt-1 text-center max-w-xs">{description}</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      'flex flex-col items-center text-center',
      className
    )}>
      <div className={cn(
        'w-16 h-16 rounded-2xl flex items-center justify-center mb-2 relative',
        earned ? 'bg-app-accent/15' : 'bg-app-muted border border-app-border'
      )}>
        {emoji ? (
          <span className={cn('text-2xl', !earned && 'grayscale-[0.4]')}>{emoji}</span>
        ) : (
          <span className="text-2xl">🏆</span>
        )}
        {!earned && (
          <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-app-card/70">
            <Lock className="h-4 w-4 text-app-foreground/70" />
          </div>
        )}
      </div>
      
      <span className={cn(
        'text-xs font-medium leading-tight',
        earned ? 'text-app-foreground' : 'text-app-foreground/80'
      )}>{name}</span>
      {earned && earnedAt && (
        <span className="text-[10px] text-app-muted-foreground mt-0.5">
          {format(new Date(earnedAt), 'd MMM yyyy', { locale: it })}
        </span>
      )}
      {earned && points != null && points > 0 && (
        <span className="text-[10px] text-app-accent font-medium mt-0.5">
          +{points} pt
        </span>
      )}
    </div>
  );
}

export default BadgeCard;
