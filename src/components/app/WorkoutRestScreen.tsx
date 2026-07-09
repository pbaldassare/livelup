// =====================================================
// WORKOUT REST SCREEN
// Recupero tra serie o prima del prossimo esercizio.
// Nell'ultimo recupero mostra anteprima "Prossimo:" in alto.
// =====================================================

import { Button } from '@/components/ui/button';
import { ChevronsRight } from 'lucide-react';
import { NextExercisePreview, type NextExerciseInfo } from '@/components/app/NextExercisePreview';

interface WorkoutRestScreenProps {
  restSeconds: number;
  restTotal: number;
  showNextPreview: boolean;
  next: NextExerciseInfo | null;
  subtitle?: string;
  onAdjustRest: (delta: number) => void;
  onSkipRest: () => void;
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function WorkoutRestScreen({
  restSeconds,
  restTotal,
  showNextPreview,
  next,
  subtitle,
  onAdjustRest,
  onSkipRest,
}: WorkoutRestScreenProps) {
  const restProgress =
    restTotal > 0 ? ((restTotal - restSeconds) / restTotal) * 100 : 0;

  if (showNextPreview && next) {
    return (
      <div className="min-h-[calc(100dvh-0px)] bg-app-background flex flex-col">
        <div className="flex-1 flex flex-col min-h-0">
          <NextExercisePreview variant="hero" next={next} />
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-6 bg-app-card border-t border-app-border">
            <p className="text-sm text-app-muted-foreground mb-3 uppercase tracking-wider">
              Recupero
            </p>
            {subtitle && (
              <p className="text-xs text-app-muted-foreground mb-4 text-center">{subtitle}</p>
            )}

            <div className="relative w-48 h-48 mb-5">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                <circle
                  cx="70"
                  cy="70"
                  r="60"
                  fill="none"
                  stroke="hsl(var(--app-muted))"
                  strokeWidth="6"
                />
                <circle
                  cx="70"
                  cy="70"
                  r="60"
                  fill="none"
                  stroke="hsl(var(--app-accent))"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 60}
                  strokeDashoffset={
                    2 * Math.PI * 60 - (restProgress / 100) * (2 * Math.PI * 60)
                  }
                  className="transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold text-app-foreground tabular-nums">
                  {formatTime(restSeconds)}
                </span>
                <span className="text-xs text-app-muted-foreground mt-1 text-center px-2">
                  Preparati per il prossimo esercizio
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAdjustRest(-15)}
                className="rounded-full border-app-border text-app-foreground hover:bg-app-muted"
              >
                −15s
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAdjustRest(15)}
                className="rounded-full border-app-border text-app-foreground hover:bg-app-muted"
              >
                +15s
              </Button>
            </div>

            <button
              type="button"
              onClick={onSkipRest}
              className="text-sm text-app-muted-foreground hover:text-app-foreground transition-colors flex items-center gap-1"
            >
              <ChevronsRight className="h-4 w-4" />
              Salta recupero
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-0px)] bg-app-background flex flex-col items-center justify-center px-6 py-8">
      <p className="text-sm text-app-muted-foreground mb-4 uppercase tracking-wider">
        Recupero
      </p>
      {subtitle && (
        <p className="text-xs text-app-muted-foreground mb-4 text-center">{subtitle}</p>
      )}

      <div className="relative w-56 h-56 mb-6">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
          <circle
            cx="70"
            cy="70"
            r="60"
            fill="none"
            stroke="hsl(var(--app-muted))"
            strokeWidth="6"
          />
          <circle
            cx="70"
            cy="70"
            r="60"
            fill="none"
            stroke="hsl(var(--app-accent))"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 60}
            strokeDashoffset={
              2 * Math.PI * 60 - (restProgress / 100) * (2 * Math.PI * 60)
            }
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold text-app-foreground tabular-nums">
            {formatTime(restSeconds)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAdjustRest(-15)}
          className="rounded-full border-app-border text-app-foreground hover:bg-app-muted"
        >
          −15s
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAdjustRest(15)}
          className="rounded-full border-app-border text-app-foreground hover:bg-app-muted"
        >
          +15s
        </Button>
      </div>

      <button
        type="button"
        onClick={onSkipRest}
        className="text-sm text-app-muted-foreground hover:text-app-foreground transition-colors flex items-center gap-1"
      >
        <ChevronsRight className="h-4 w-4" />
        Salta recupero
      </button>
    </div>
  );
}

export default WorkoutRestScreen;
