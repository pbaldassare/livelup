// =====================================================
// Durata intercambiabile min | sec per editor PT.
// Persiste solo secondi. Unità minuti è display locale.
// =====================================================

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { TouchIntegerInput } from '@/components/pt/TouchIntegerInput';
import {
  type DurationUnit,
  formatDurationClock,
  minDisplayForUnit,
  secondsAfterUnitSwitch,
  secondsToUnitDisplay,
  stepForUnit,
  unitValueToSeconds,
} from '@/lib/durationUnit';

interface DurationUnitInputProps {
  valueSeconds: number | null | undefined;
  onCommitSeconds: (seconds: number) => void;
  allowEmpty?: boolean;
  onEmptyCommit?: () => void;
  minSeconds?: number;
  maxSeconds?: number;
  stepSeconds?: number;
  fallbackSeconds?: number;
  label?: string | null;
  showLabel?: boolean;
  showHint?: boolean;
  compact?: boolean;
  id?: string;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
  inputClassName?: string;
  onBlur?: () => void;
}

function UnitToggle({
  unit,
  onChange,
  compact,
  disabled,
}: {
  unit: DurationUnit;
  onChange: (next: DurationUnit) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex rounded border border-border overflow-hidden touch-manipulation',
        compact ? 'h-11 min-h-[44px] sm:h-6 sm:min-h-0' : 'h-11 min-h-[44px] sm:h-8 sm:min-h-0 md:h-6',
      )}
    >
      {(['min', 'sec'] as const).map((u, idx) => (
        <button
          key={u}
          type="button"
          disabled={disabled}
          className={cn(
            'flex flex-1 min-h-[44px] items-center justify-center font-medium transition-colors sm:min-h-0',
            compact ? 'text-xs sm:text-[10px]' : 'text-sm sm:text-xs md:text-[10px]',
            idx > 0 && 'border-l border-border',
            unit === u
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:bg-muted',
          )}
          aria-label={u === 'min' ? 'Unità minuti' : 'Unità secondi'}
          onClick={() => onChange(u)}
        >
          {u}
        </button>
      ))}
    </div>
  );
}

export function DurationUnitInput({
  valueSeconds,
  onCommitSeconds,
  allowEmpty = false,
  onEmptyCommit,
  minSeconds = 1,
  maxSeconds,
  stepSeconds = 5,
  fallbackSeconds = 60,
  label,
  showLabel = false,
  showHint = false,
  compact = false,
  id,
  disabled = false,
  'aria-label': ariaLabel,
  className,
  inputClassName,
  onBlur,
}: DurationUnitInputProps) {
  const [unit, setUnit] = useState<DurationUnit>('sec');

  const displayValue = secondsToUnitDisplay(valueSeconds, unit);
  const minDisplay = minDisplayForUnit(unit, minSeconds);
  const maxDisplay =
    maxSeconds == null
      ? undefined
      : unit === 'min'
        ? Math.max(minDisplay, Math.floor(maxSeconds / 60))
        : maxSeconds;
  const fallbackDisplay =
    secondsToUnitDisplay(fallbackSeconds, unit) ?? (unit === 'min' ? 1 : fallbackSeconds);

  const switchUnit = (next: DurationUnit) => {
    if (next === unit) return;
    setUnit(next);
    if (allowEmpty && (valueSeconds == null || !Number.isFinite(valueSeconds))) return;
    const snapped = secondsAfterUnitSwitch(valueSeconds, next, minSeconds);
    if (snapped != null && snapped !== valueSeconds) {
      onCommitSeconds(snapped);
    }
  };

  const commitDisplay = (n: number) => {
    onCommitSeconds(unitValueToSeconds(unit, n, minSeconds));
  };

  const hint =
    showHint && valueSeconds != null && Number.isFinite(valueSeconds)
      ? formatDurationClock(valueSeconds)
      : null;

  return (
    <div className={cn('space-y-0.5', className)}>
      {showLabel && label != null && (
        <Label className="text-xs">
          {label}
          {hint && <span className="text-muted-foreground"> · {hint}</span>}
        </Label>
      )}
      <div className="flex flex-col gap-1">
        <UnitToggle unit={unit} onChange={switchUnit} compact={compact} disabled={disabled} />
        <TouchIntegerInput
          id={id}
          compact={compact}
          disabled={disabled}
          value={displayValue}
          min={minDisplay}
          max={maxDisplay}
          step={stepForUnit(unit, stepSeconds)}
          fallback={fallbackDisplay}
          allowEmpty={allowEmpty}
          onEmptyCommit={onEmptyCommit}
          aria-label={ariaLabel ?? (unit === 'min' ? 'Durata in minuti' : 'Durata in secondi')}
          inputClassName={inputClassName}
          onBlur={onBlur}
          onCommit={commitDisplay}
        />
      </div>
    </div>
  );
}
