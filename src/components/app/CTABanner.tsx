import { cn } from '@/lib/utils';
import { ChevronRight, LucideIcon, MessageSquare, Zap, Award } from 'lucide-react';

// =====================================================
// CTA BANNER - Banner con call-to-action
// Design: sfondo grigio scuro, bordo accent, icona
// =====================================================

interface CTABannerProps {
  title: string;
  subtitle?: string;
  actionLabel: string;
  icon?: LucideIcon | React.ReactNode;
  onAction?: () => void;
  variant?: 'default' | 'achievement' | 'coach';
  className?: string;
}

export function CTABanner({
  title,
  subtitle,
  actionLabel,
  icon,
  onAction,
  variant = 'default',
  className,
}: CTABannerProps) {
  const renderIcon = () => {
    if (!icon) return null;
    if (typeof icon === 'function') {
      const IconComponent = icon as LucideIcon;
      return <IconComponent className="h-6 w-6 text-app-accent" />;
    }
    return icon as React.ReactNode;
  };
  return (
    <div 
      className={cn(
        'relative overflow-hidden rounded-xl p-4 cursor-pointer',
        'active:scale-[0.99] transition-transform',
        variant === 'default' && 'bg-gray-800/80 border border-white/10',
        variant === 'achievement' && 'bg-gray-800/80 border border-white/10',
        variant === 'coach' && 'bg-gray-800/80 border border-white/10',
        className
      )}
      onClick={onAction}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        {icon && (
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-700/50 flex items-center justify-center">
            {renderIcon()}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/80 leading-tight">
            {title}
            {subtitle && <span className="block text-white/60">{subtitle}</span>}
          </p>
          <button className="flex items-center gap-1 mt-2 text-app-accent font-semibold text-sm">
            {actionLabel}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// ACHIEVEMENT BANNER - Banner per traguardi
// =====================================================

interface AchievementBannerProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function AchievementBanner({
  title,
  subtitle,
  actionLabel,
  onAction,
  className,
}: AchievementBannerProps) {
  return (
    <div 
      className={cn(
        'relative overflow-hidden rounded-xl bg-gray-800/80 border border-white/10',
        'cursor-pointer active:scale-[0.99] transition-transform',
        className
      )}
      onClick={onAction}
    >
      <div className="flex items-center p-4">
        {/* Content */}
        <div className="flex-1">
          <p className="text-white/90 text-sm font-medium">{title}</p>
          {subtitle && <p className="text-white/60 text-xs mt-0.5">{subtitle}</p>}
          
          {actionLabel && (
            <button className="flex items-center gap-1 mt-2 text-app-accent font-semibold text-sm">
              {actionLabel}
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Icon Graphic */}
        <div className="flex-shrink-0 w-16 h-16 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <Award className="h-10 w-10 text-app-accent opacity-30" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default CTABanner;
