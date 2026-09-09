// =====================================================
// Note da mobile: textarea a capo, 16px (niente zoom iOS),
// X per svuotare, scroll sopra la tastiera al focus.
// =====================================================

import { useRef } from 'react';
import { X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface MobileNotesFieldProps {
  value: string;
  onChange: (next: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  id?: string;
  'aria-label'?: string;
  className?: string;
  rows?: number;
  disabled?: boolean;
}

export function MobileNotesField({
  value,
  onChange,
  onBlur,
  placeholder,
  id,
  'aria-label': ariaLabel,
  className,
  rows = 4,
  disabled = false,
}: MobileNotesFieldProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const canClear = value.trim().length > 0;

  return (
    <div className={cn('relative', className)}>
      <Textarea
        ref={ref}
        id={id}
        value={value}
        rows={rows}
        placeholder={placeholder}
        aria-label={ariaLabel}
        enterKeyHint="enter"
        autoCapitalize="sentences"
        autoCorrect="on"
        spellCheck
        disabled={disabled}
        onFocus={(e) => {
          e.currentTarget.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
        }}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[96px] resize-y pr-10 text-base leading-relaxed md:min-h-[80px] md:text-sm"
      />
      {canClear && !disabled && (
        <button
          type="button"
          className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Cancella note"
          onClick={() => {
            onChange('');
            ref.current?.focus();
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
