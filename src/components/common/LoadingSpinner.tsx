import { Logo } from './Logo';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'logo' | 'dots';
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ 
  size = 'md', 
  variant = 'logo',
  text,
  className,
  fullScreen = false
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  const containerClasses = cn(
    'flex flex-col items-center justify-center gap-4',
    fullScreen && 'fixed inset-0 z-50 bg-background',
    className
  );

  if (variant === 'spinner') {
    return (
      <div className={containerClasses}>
        <div 
          className={cn(
            'rounded-full border-2 border-muted border-t-primary animate-spin',
            sizeClasses[size]
          )} 
        />
        {text && (
          <p className={cn('text-muted-foreground', textSizeClasses[size])}>{text}</p>
        )}
      </div>
    );
  }

  if (variant === 'dots') {
    const dotSize = {
      sm: 'h-1.5 w-1.5',
      md: 'h-2 w-2',
      lg: 'h-3 w-3',
      xl: 'h-4 w-4'
    };

    return (
      <div className={containerClasses}>
        <div className="flex items-center gap-1">
          <div className={cn('rounded-full bg-primary animate-loading-dot animate-loading-dot-delay-1', dotSize[size])} />
          <div className={cn('rounded-full bg-primary animate-loading-dot animate-loading-dot-delay-2', dotSize[size])} />
          <div className={cn('rounded-full bg-primary animate-loading-dot', dotSize[size])} />
        </div>
        {text && (
          <p className={cn('text-muted-foreground', textSizeClasses[size])}>{text}</p>
        )}
      </div>
    );
  }

  // Default: logo variant
  return (
    <div className={containerClasses}>
      <div className="animate-logo-shimmer">
        <Logo variant="icon" className={cn(sizeClasses[size], 'animate-bounce-subtle')} />
      </div>
      {text && (
        <p className={cn('text-muted-foreground animate-pulse', textSizeClasses[size])}>{text}</p>
      )}
    </div>
  );
}

export default LoadingSpinner;
