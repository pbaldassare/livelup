import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

// =====================================================
// EMPTY STATE - Componente per stati vuoti
// Riutilizzabile in tutta l'app
// =====================================================

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  variant?: 'default' | 'compact' | 'card';
  iconClassName?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  variant = 'default',
  iconClassName,
}: EmptyStateProps) {
  const isCompact = variant === 'compact';
  
  return (
    <div 
      className={cn(
        'flex flex-col items-center justify-center text-center',
        isCompact ? 'py-6' : 'py-12',
        variant === 'card' && 'bg-muted/30 rounded-lg border border-dashed',
        className
      )}
    >
      <div 
        className={cn(
          'rounded-full bg-muted/50 flex items-center justify-center',
          isCompact ? 'h-10 w-10 mb-3' : 'h-16 w-16 mb-4'
        )}
      >
        <Icon 
          className={cn(
            'text-muted-foreground',
            isCompact ? 'h-5 w-5' : 'h-8 w-8',
            iconClassName
          )} 
        />
      </div>
      <h3 
        className={cn(
          'font-semibold text-foreground',
          isCompact ? 'text-sm' : 'text-lg'
        )}
      >
        {title}
      </h3>
      {description && (
        <p 
          className={cn(
            'text-muted-foreground max-w-sm',
            isCompact ? 'text-xs mt-1' : 'text-sm mt-2'
          )}
        >
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button 
          onClick={onAction} 
          className={cn('mt-4', isCompact && 'h-8 text-xs')}
          size={isCompact ? 'sm' : 'default'}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// =====================================================
// ERROR STATE - Componente per stati di errore
// =====================================================

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Qualcosa è andato storto',
  description = 'Si è verificato un errore durante il caricamento. Riprova.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div 
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}
    >
      <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <svg
          className="h-8 w-8 text-destructive"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm">{description}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="mt-4">
          Riprova
        </Button>
      )}
    </div>
  );
}

// =====================================================
// LOADING STATE - Componente per stati di caricamento
// =====================================================

interface LoadingStateProps {
  message?: string;
  className?: string;
  variant?: 'spinner' | 'logo' | 'dots';
}

export function LoadingState({
  message = 'Caricamento...',
  className,
  variant = 'logo',
}: LoadingStateProps) {
  return (
    <div 
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}
    >
      <LoadingSpinner variant={variant} size="md" text={message} />
    </div>
  );
}

// =====================================================
// LOCKED STATE - Componente per funzionalità bloccate
// =====================================================

interface LockedStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function LockedState({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: LockedStateProps) {
  return (
    <div 
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center bg-muted/30 rounded-lg border border-dashed',
        className
      )}
    >
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <svg
          className="h-8 w-8 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
