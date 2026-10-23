// =====================================================
// Input "fatto davvero" per esercizi dentro un protocollo
// + riepilogo di fine protocollo (EMOM / AMRAP / HIIT / TABATA).
// =====================================================

import { Check, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  actualValueLabel,
  clampDone,
  groupEntriesByRound,
  isEntryShort,
  roundLabel,
  sumDoneReps,
  sumDoneSeconds,
  type ProtocolResultEntry,
} from '@/lib/protocols/protocolResults';

export function ActualValueStepper({
  value,
  onChange,
  mode,
  label,
  size = 'md',
  ariaLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  mode: ProtocolResultEntry['mode'];
  label?: string | null;
  size?: 'sm' | 'md';
  ariaLabel?: string;
}) {
  const step = mode === 'seconds' ? 5 : 1;
  const small = size === 'sm';
  return (
    <div className={cn('flex items-center gap-3', label ? 'justify-between' : 'justify-end')}>
      {label && <span className="text-sm font-medium text-app-foreground">{label}</span>}
      <div className={cn('flex items-center', small ? 'gap-1.5' : 'gap-3')}>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Diminuisci"
          onClick={() => onChange(clampDone(value - step))}
          className={cn('rounded-full border-app-border', small ? 'h-8 w-8' : 'h-10 w-10')}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          aria-label={ariaLabel ?? label ?? actualValueLabel(mode)}
          value={value}
          onChange={(e) => onChange(clampDone(parseInt(e.target.value, 10) || 0))}
          className={cn(
            'text-center bg-app-muted border-app-border text-app-foreground font-bold tabular-nums',
            small ? 'w-14 h-8 text-base' : 'w-20 text-xl',
          )}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Aumenta"
          onClick={() => onChange(clampDone(value + step))}
          className={cn('rounded-full border-app-border', small ? 'h-8 w-8' : 'h-10 w-10')}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function targetHint(entry: ProtocolResultEntry): string | null {
  if (entry.target == null) return null;
  return entry.mode === 'seconds' ? `Previsti ${entry.target}s` : `Previste ${entry.target} reps`;
}

export function ProtocolResultsReview({
  protocol,
  entries,
  onChange,
  onConfirm,
  requireFullCompletion = false,
  subtitle,
}: {
  protocol: string;
  entries: ProtocolResultEntry[];
  onChange: (index: number, value: number) => void;
  onConfirm: () => void;
  requireFullCompletion?: boolean;
  subtitle?: string;
}) {
  const indexed = entries.map((entry, index) => ({ ...entry, _index: index }));
  const groups = groupEntriesByRound(indexed);
  const totalReps = sumDoneReps(entries);
  const totalSeconds = sumDoneSeconds(entries);
  const blocked = requireFullCompletion && entries.some(isEntryShort);

  return (
    <div className="flex flex-col items-center px-5 py-6">
      <p className="text-lg font-bold text-app-foreground">Cosa hai fatto?</p>
      <p className="text-sm text-app-muted-foreground text-center mt-1 mb-5 max-w-md">
        {subtitle ?? 'Correggi i valori se hai fatto più o meno di quanto previsto.'}
      </p>

      <div className="w-full max-w-md space-y-4 mb-6">
        {groups.map((group) => (
          <div
            key={`round-${group.round ?? 'total'}`}
            className="rounded-2xl border border-app-border/70 bg-app-card/60 p-4 space-y-3"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-app-muted-foreground">
              {roundLabel(protocol, group.round)}
            </p>
            {group.entries.map((entry) => {
              const hint = targetHint(entry);
              return (
                <div key={entry._index} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-app-foreground truncate">{entry.name}</p>
                    <p
                      className={cn(
                        'text-xs',
                        isEntryShort(entry) ? 'text-destructive' : 'text-app-muted-foreground',
                      )}
                    >
                      {hint ?? actualValueLabel(entry.mode)}
                    </p>
                  </div>
                  <ActualValueStepper
                    size="sm"
                    mode={entry.mode}
                    value={entry.done}
                    ariaLabel={`${entry.name}: ${actualValueLabel(entry.mode)}`}
                    onChange={(v) => onChange(entry._index, v)}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <p className="text-sm text-app-muted-foreground mb-4 tabular-nums">
        Totale: {totalReps} reps
        {totalSeconds > 0 ? ` · ${totalSeconds}s` : ''}
      </p>

      {blocked && (
        <p className="text-xs text-destructive mb-3 text-center max-w-md">
          Scheda progressiva: servono almeno i valori previsti per continuare.
        </p>
      )}

      <Button
        onClick={onConfirm}
        disabled={blocked}
        className="w-full max-w-md h-14 rounded-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90 text-base font-semibold"
      >
        <Check className="h-5 w-5 mr-2" />
        Salva e continua
      </Button>
    </div>
  );
}
