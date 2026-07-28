import { cn } from '@/lib/utils';

interface CourseProgressBarProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
  showPercent?: boolean;
}

/** Circular lime progress for athlete course screens. */
export function CourseProgressBar({
  value,
  size = 96,
  strokeWidth = 8,
  className,
  label,
  showPercent = true,
}: CourseProgressBarProps) {
  const pct = Math.min(100, Math.max(0, Math.round(value || 0)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="stroke-app-muted"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="stroke-app-accent transition-[stroke-dashoffset] duration-500"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        {showPercent && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-app-foreground tabular-nums">{pct}%</span>
          </div>
        )}
      </div>
      {label ? <p className="text-xs text-app-muted-foreground">{label}</p> : null}
    </div>
  );
}

export default CourseProgressBar;
