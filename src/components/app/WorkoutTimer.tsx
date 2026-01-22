import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Plus, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// WORKOUT TIMER - Circular timer with prep time
// Design reference: Ladder_iOS_60, Ladder_iOS_61, Ladder_iOS_62
// =====================================================

interface WorkoutTimerProps {
  initialSeconds?: number;
  onComplete?: () => void;
  isRest?: boolean;
  autoStart?: boolean;
}

export function WorkoutTimer({
  initialSeconds = 60,
  onComplete,
  isRest = false,
  autoStart = false,
}: WorkoutTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [showPrepTime, setShowPrepTime] = useState(false);
  const [prepSeconds, setPrepSeconds] = useState(5);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            onComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, seconds, onComplete]);

  const toggleTimer = useCallback(() => {
    setIsRunning((prev) => !prev);
  }, []);

  const handleAddPrepTime = useCallback(() => {
    setSeconds((prev) => prev + prepSeconds);
    setShowPrepTime(false);
  }, [prepSeconds]);

  // Calculate progress for circular indicator
  const progress = ((initialSeconds - seconds) / initialSeconds) * 100;
  const circumference = 2 * Math.PI * 60; // radius = 60
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      {/* Timer Circle */}
      <div className="relative w-48 h-48">
        {/* Background circle */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
          <circle
            cx="70"
            cy="70"
            r="60"
            fill="none"
            stroke="hsl(var(--app-muted))"
            strokeWidth="4"
            strokeDasharray="8 4"
          />
          {/* Progress circle */}
          <circle
            cx="70"
            cy="70"
            r="60"
            fill="none"
            stroke="hsl(var(--app-accent))"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-200"
          />
        </svg>

        {/* Time display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-5xl font-bold text-app-foreground tabular-nums">
            {formatTime(seconds)}
          </span>
        </div>
      </div>

      {/* Controls */}
      {showPrepTime ? (
        <div className="mt-6 w-full max-w-xs space-y-4 px-4">
          <div className="flex items-center justify-between">
            <span className="text-app-foreground">Add time to prepare</span>
            <span className="text-3xl font-bold text-app-accent">+{prepSeconds}s</span>
          </div>
          
          <Slider
            value={[prepSeconds]}
            onValueChange={([val]) => setPrepSeconds(val)}
            min={0}
            max={60}
            step={5}
            className="my-4"
          />
          
          <div className="flex justify-between text-xs text-app-muted-foreground">
            <span>+0 s</span>
            <span>+5 s</span>
            <span>+10 s</span>
            <span>+30 s</span>
            <span>+60 s</span>
          </div>

          <Button
            variant="outline"
            onClick={handleAddPrepTime}
            className="w-full rounded-full border-app-border text-app-foreground"
          >
            Done
          </Button>
        </div>
      ) : (
        <div className="mt-6 flex items-center gap-6">
          {/* Prep time button */}
          <button
            onClick={() => setShowPrepTime(true)}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-12 h-12 rounded-full bg-app-muted flex items-center justify-center">
              <Plus className="h-5 w-5 text-app-muted-foreground" />
            </div>
            <span className="text-xs text-app-muted-foreground">prep</span>
          </button>

          {/* Play/Pause button */}
          <button
            onClick={toggleTimer}
            className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center transition-colors',
              isRunning 
                ? 'bg-app-muted text-app-foreground' 
                : 'bg-app-accent text-app-accent-foreground'
            )}
          >
            {isRunning ? (
              <Pause className="h-7 w-7" />
            ) : (
              <Play className="h-7 w-7 ml-1" />
            )}
          </button>

          {/* Reps counter (placeholder) */}
          <button className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-app-muted flex items-center justify-center">
              <Plus className="h-5 w-5 text-app-muted-foreground" />
            </div>
            <span className="text-xs text-app-muted-foreground">reps</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default WorkoutTimer;
