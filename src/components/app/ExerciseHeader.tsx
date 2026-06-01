// =====================================================
// EXERCISE HEADER
// Clickable exercise title shown across athlete workout
// players. Includes a small protocol badge and the coach
// notes line (if any). Tapping the header opens the
// AtletaExerciseDetailSheet via the onShowDetails callback.
// =====================================================

import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProtocolType =
  | 'standard'
  | 'SET'
  | 'EMOM'
  | 'AMRAP'
  | 'SUPERSET'
  | 'HIIT'
  | 'TABATA'
  | 'RAMPING'
  | string;

interface ExerciseHeaderProps {
  name: string;
  protocolType?: ProtocolType | null;
  notes?: string | null;
  onShowDetails?: () => void;
  align?: 'left' | 'center';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const PROTOCOL_LABELS: Record<string, string> = {
  standard: 'Standard',
  SET: 'Standard',
  EMOM: 'EMOM',
  AMRAP: 'AMRAP',
  SUPERSET: 'Superset',
  HIIT: 'HIIT',
  TABATA: 'TABATA',
  RAMPING: 'Ramping',
};

function protocolLabel(p?: string | null): string {
  if (!p) return 'Standard';
  return PROTOCOL_LABELS[p] || PROTOCOL_LABELS[p.toUpperCase()] || p;
}

export function ExerciseHeader({
  name,
  protocolType,
  notes,
  onShowDetails,
  align = 'center',
  size = 'md',
  className,
}: ExerciseHeaderProps) {
  const clickable = !!onShowDetails;
  const titleClass =
    size === 'lg'
      ? 'text-2xl font-bold'
      : size === 'sm'
        ? 'text-base font-bold'
        : 'text-xl font-bold';

  const Wrapper: React.ElementType = clickable ? 'button' : 'div';

  return (
    <div
      className={cn(
        'flex flex-col',
        align === 'center' ? 'items-center text-center' : 'items-start text-left',
        className,
      )}
    >
      <Wrapper
        type={clickable ? 'button' : undefined}
        onClick={onShowDetails}
        className={cn(
          'group inline-flex items-center gap-1.5 max-w-full',
          clickable && 'cursor-pointer active:opacity-80 transition-opacity',
        )}
        aria-label={clickable ? `Dettagli esercizio: ${name}` : undefined}
      >
        <span className={cn(titleClass, 'text-app-foreground truncate')}>
          {name}
        </span>
        {clickable && (
          <Info className="h-4 w-4 text-app-muted-foreground shrink-0 group-hover:text-app-accent transition-colors" />
        )}
      </Wrapper>

      {/* Protocol badge */}
      <span
        className="mt-1 inline-flex items-center rounded-full bg-app-muted/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
        style={{ color: '#D4FF00' }}
      >
        {protocolLabel(protocolType)}
      </span>

      {/* Coach notes line */}
      {notes && notes.trim() !== '' && (
        <p
          className={cn(
            'mt-1.5 text-xs text-app-muted-foreground/90 leading-snug max-w-sm whitespace-pre-line',
            align === 'center' ? 'text-center' : 'text-left',
          )}
          style={{ opacity: 0.7 }}
        >
          {notes}
        </p>
      )}
    </div>
  );
}

export default ExerciseHeader;
