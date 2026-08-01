import { useEffect, useState } from 'react';
import { Logo } from './Logo';
import { cn } from '@/lib/utils';

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number;
  className?: string;
}

export function SplashScreen({ 
  onComplete, 
  duration = 2000,
  className 
}: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimatingOut(true);
      setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div 
      className={cn(
        'fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-300',
        isAnimatingOut && 'opacity-0',
        className
      )}
    >
      {/* Gradient background effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/10 via-transparent to-transparent blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-gradient-to-tl from-primary/5 via-transparent to-transparent blur-2xl animate-pulse" />
      </div>

      {/* Logo with animation */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="animate-logo-shimmer">
          <Logo variant="icon" className="h-24 w-24 animate-bounce-subtle" />
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-bold text-gradient-primary">Livelapp</h1>
          <p className="text-sm text-muted-foreground animate-pulse">Caricamento...</p>
        </div>

        {/* Loading dots */}
        <div className="flex items-center gap-2 mt-4">
          <div className="h-2 w-2 rounded-full bg-primary animate-loading-dot animate-loading-dot-delay-1" />
          <div className="h-2 w-2 rounded-full bg-primary animate-loading-dot animate-loading-dot-delay-2" />
          <div className="h-2 w-2 rounded-full bg-primary animate-loading-dot" />
        </div>
      </div>
    </div>
  );
}

export default SplashScreen;
