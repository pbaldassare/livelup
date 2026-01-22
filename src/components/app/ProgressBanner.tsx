import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// PROGRESS BANNER - Banner for challenges/series
// Design reference: Ladder_iOS_163.png
// =====================================================

interface ProgressBannerProps {
  title: string;
  dateRange: string;
  duration: string;
  badgeImage?: string;
  badgeMessage: string;
  isLocked: boolean;
  unlockMessage?: string;
  workoutsRequired?: number;
  className?: string;
}

export function ProgressBanner({
  title,
  dateRange,
  duration,
  badgeImage,
  badgeMessage,
  isLocked,
  unlockMessage,
  workoutsRequired,
  className,
}: ProgressBannerProps) {
  return (
    <div className={cn('bg-app-background', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-app-border">
        <h1 className="text-xl font-bold text-app-foreground">{title}</h1>
      </div>

      {/* Program info */}
      <div className="px-4 py-4 border-b border-app-border">
        <h2 className="text-lg font-bold text-orange-500 uppercase tracking-wide">RELOAD</h2>
        <p className="text-sm text-app-muted-foreground">
          {dateRange} • {duration}
        </p>
      </div>

      {/* Badge unlock banner */}
      <div className="mx-4 my-4 p-4 bg-gradient-to-r from-amber-900/40 to-amber-800/20 rounded-xl flex items-center gap-4">
        {badgeImage ? (
          <img src={badgeImage} alt="Badge" className="w-12 h-12 object-contain opacity-70" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-app-muted flex items-center justify-center">
            🏆
          </div>
        )}
        <p className="text-sm text-app-foreground flex-1">{badgeMessage}</p>
      </div>

      {/* Locked stats section */}
      {isLocked && (
        <div className="mx-4 mb-4 aspect-video bg-gradient-to-b from-app-muted to-app-background rounded-xl flex flex-col items-center justify-center text-center p-6">
          <div className="w-16 h-16 bg-app-muted rounded-full flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-app-muted-foreground" />
          </div>
          <p className="text-app-foreground max-w-xs">
            {unlockMessage || `Complete ${workoutsRequired || 3} workouts to unlock your stats`}
          </p>
        </div>
      )}
    </div>
  );
}

export default ProgressBanner;
