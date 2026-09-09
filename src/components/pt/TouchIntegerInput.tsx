// =====================================================
// Input intero touch-friendly: − / valore / X / +
// Campo svuotabile, select-all al focus, commit su blur.
// =====================================================

import { useEffect, useRef, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  commitPositiveInt,
  formatCommittedInt,
  sanitizeIntegerInput,
  stepPositiveInt,
} from '@/lib/touchNumericInput';

interface TouchIntegerInputProps {
  value: number | null | undefined;
  onCommit: (next: number) => void;
  /** Se true e il campo è vuoto al blur, chiama onEmptyCommit invece del fallback. */
  allowEmpty?: boolean;
  onEmptyCommit?: () => void;
  min?: number;
  max?: number;
  step?: number;
  fallback?: number;
  id?: string;
  disabled?: boolean;
  /** Senza −/+: per celle tabella. Stesso svuota / riscrivi / X. */
  compact?: boolean;
  'aria-label'?: string;
  className?: string;
  inputClassName?: string;
}

export function TouchIntegerInput({
  value,
  onCommit,
  allowEmpty = false,
  onEmptyCommit,
  min = 1,
  max,
  step = 1,
  fallback = 1,
  id,
  disabled = false,
  compact = false,
  'aria-label': ariaLabel,
  className,
  inputClassName,
}: TouchIntegerInputProps) {
  const committed = formatCommittedInt(value);
  const [draft, setDraft] = useState(committed);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipFocusSeedRef = useRef(false);

  useEffect(() => {
    if (!focused) setDraft(committed);
  }, [committed, focused]);

  const shown = focused ? draft : committed;
  const canClear = shown !== '';

  const selectAll = () => {
    const el = inputRef.current;
    if (!el) return;
    el.select();
    requestAnimationFrame(() => el.select());
    window.setTimeout(() => el.select(), 0);
  };

  const commitDraft = (raw: string) => {
    if (allowEmpty && raw.trim() === '') {
      onEmptyCommit?.();
      return;
    }
    onCommit(commitPositiveInt(raw, fallback, min, max));
  };

  const clearDraft = () => {
    setDraft('');
    setFocused(true);
    if (document.activeElement !== inputRef.current) {
      skipFocusSeedRef.current = true;
      inputRef.current?.focus();
    }
  };

  const stepSize = Math.max(1, Math.floor(step));

  const stepBy = (dir: 1 | -1) => {
    const emptyDraft = focused && draft.trim() === '';
    if (emptyDraft) {
      setDraft(String(min));
      onCommit(min);
      return;
    }
    const current = focused
      ? commitPositiveInt(draft, value ?? fallback, min, max)
      : (value ?? fallback);
    const next = stepPositiveInt(current, dir * stepSize, min, max);
    setDraft(String(next));
    onCommit(next);
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {!compact && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          className="h-10 w-10 shrink-0"
          aria-label="Diminuisci"
          onClick={() => stepBy(-1)}
        >
          <Minus className="h-4 w-4" />
        </Button>
      )}

      <div className="relative min-w-0 flex-1">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={disabled}
          value={shown}
          aria-label={ariaLabel}
          onFocus={() => {
            if (skipFocusSeedRef.current) {
              skipFocusSeedRef.current = false;
            } else {
              setDraft(committed);
            }
            setFocused(true);
            selectAll();
          }}
          onBlur={() => {
            commitDraft(draft);
            setFocused(false);
          }}
          onChange={(e) => {
            setDraft(sanitizeIntegerInput(e.target.value));
          }}
          className={cn(
            'text-center tabular-nums',
            compact
              ? 'h-8 pr-8 text-base md:text-xs'
              : 'h-10 pr-10 text-base md:text-sm',
            inputClassName,
          )}
        />
        {canClear && !disabled && (
          <button
            type="button"
            tabIndex={-1}
            className={cn(
              'absolute right-1 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground',
              compact ? 'h-7 w-7' : 'h-8 w-8',
            )}
            aria-label="Cancella numero"
            onPointerDown={(e) => {
              e.preventDefault();
              clearDraft();
            }}
            onClick={(e) => {
              e.preventDefault();
              clearDraft();
            }}
          >
            <X className={cn(compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
          </button>
        )}
      </div>

      {!compact && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          className="h-10 w-10 shrink-0"
          aria-label="Aumenta"
          onClick={() => stepBy(1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
