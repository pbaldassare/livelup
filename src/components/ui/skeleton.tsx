import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'pulse' | 'shimmer';
  shape?: 'rectangle' | 'circle' | 'text';
}

function Skeleton({ 
  className, 
  variant = 'shimmer',
  shape = 'rectangle',
  ...props 
}: SkeletonProps) {
  return (
    <div 
      className={cn(
        "rounded-md",
        variant === 'shimmer' ? 'skeleton-shimmer' : 'animate-pulse bg-muted',
        shape === 'circle' && 'rounded-full',
        shape === 'text' && 'h-4 rounded',
        className
      )} 
      {...props} 
    />
  );
}

export { Skeleton };
