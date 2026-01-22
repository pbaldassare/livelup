import { Logo } from './Logo';
import { cn } from '@/lib/utils';

interface PageLoaderProps {
  text?: string;
  className?: string;
}

export function PageLoader({ text = 'Caricamento...', className }: PageLoaderProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center min-h-[400px] gap-6', className)}>
      <div className="animate-logo-shimmer">
        <Logo variant="icon" className="h-16 w-16 animate-bounce-subtle" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-primary animate-loading-dot animate-loading-dot-delay-1" />
          <div className="h-2 w-2 rounded-full bg-primary animate-loading-dot animate-loading-dot-delay-2" />
          <div className="h-2 w-2 rounded-full bg-primary animate-loading-dot" />
        </div>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

export default PageLoader;
