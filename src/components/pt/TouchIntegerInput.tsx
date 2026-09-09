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
  min?: number;
  fallback?: number;
  id?: string;
  'aria-label'?: string;
  className?: string;
  inputClassName?: string;
}

export function TouchIntegerInput({
  value,
  onCommit,
  min = 1,
  fallback = 1,
  id,
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
    onCommit(commitPositiveInt(raw, fallback, min));
  };

  const clearDraft = () => {
    setDraft('');
    setFocused(true);
    if (document.activeElement !== inputRef.current) {
      skipFocusSeedRef.current = true;
      inputRef.current?.focus();
    }
  };

  const stepBy = (delta: number) => {
    const emptyDraft = focused && draft.trim() === '';
    const base = emptyDraft
      ? delta > 0
        ? min - 1
        : min
      : focused
        ? commitPositiveInt(draft, value ?? fallback, min)
        : (value ?? fallback);
    const next = stepPositiveInt(base, delta, min);
    setDraft(String(next));
    onCommit(next);
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-10 w-10 shrink-0"
        aria-label="Diminuisci"
        onClick={() => stepBy(-1)}
      >
        <Minus className="h-4 w-4" />
      </Button>

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
          className={cn('h-10 pr-10 text-center text-base tabular-nums md:text-sm', inputClassName)}
        />
        {canClear && (
          <button
            type="button"
            tabIndex={-1}
            className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
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
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-10 w-10 shrink-0"
        aria-label="Aumenta"
        onClick={() => stepBy(1)}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
