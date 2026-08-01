// =====================================================
// Campo carico: Corpo libero | Kg | Elastici (colori) | Altro
// =====================================================

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  BAND_COLORS,
  LOAD_MODE_OPTIONS,
  getLoadMode,
  normalizeLoad,
  switchLoadMode,
  type LoadFields,
  type LoadMode,
} from '@/lib/loadPrescription';

interface LoadFieldProps {
  value: Partial<LoadFields>;
  onChange: (next: LoadFields) => void;
  className?: string;
  label?: string | null;
  showLabel?: boolean;
  /** Compatto per celle tabella / protocol row */
  compact?: boolean;
  id?: string;
}

export function LoadField({
  value,
  onChange,
  className,
  label = 'Carico',
  showLabel = true,
  compact = false,
  id,
}: LoadFieldProps) {
  const load = normalizeLoad(value as Record<string, unknown>);
  const mode = getLoadMode(load);

  const setMode = (next: LoadMode) => {
    onChange(switchLoadMode(load, next));
  };

  return (
    <div className={cn('space-y-0.5', className)}>
      {showLabel && label != null && (
        <Label className="text-[10px] text-muted-foreground">{label}</Label>
      )}
      <div className={cn('flex flex-col gap-1', compact && 'min-w-[100px]')}>
        <Select value={mode} onValueChange={(v) => setMode(v as LoadMode)}>
          <SelectTrigger
            id={id}
            className={cn('h-8 text-xs', compact && 'h-7 px-2')}
            aria-label="Tipo carico"
          >
            <SelectValue placeholder="Carico" />
          </SelectTrigger>
          <SelectContent>
            {LOAD_MODE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {mode === 'kg' && (
          <Input
            type="number"
            min={0}
            step={0.5}
            value={load.weight ?? ''}
            placeholder="kg"
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                onChange({ ...load, load_mode: 'kg', weight: null });
                return;
              }
              const n = Number(raw);
              onChange({
                ...load,
                load_mode: 'kg',
                weight: Number.isFinite(n) && n >= 0 ? n : null,
                band_color: null,
                other_text: null,
              });
            }}
            className={cn('h-8', compact && 'h-7 text-xs px-1.5')}
            aria-label="Kg"
          />
        )}

        {mode === 'band' && (
          <Select
            value={load.band_color ?? 'giallo'}
            onValueChange={(color) =>
              onChange({
                load_mode: 'band',
                weight: null,
                band_color: color,
                other_text: null,
              })
            }
          >
            <SelectTrigger
              className={cn('h-8 text-xs', compact && 'h-7 px-2')}
              aria-label="Colore elastico"
            >
              <SelectValue placeholder="Colore" />
            </SelectTrigger>
            <SelectContent>
              {BAND_COLORS.map((c) => (
                <SelectItem key={c.value} value={c.value} className="text-xs">
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {mode === 'other' && (
          <Input
            type="text"
            value={load.other_text ?? ''}
            placeholder="Attrezzatura…"
            onChange={(e) =>
              onChange({
                load_mode: 'other',
                weight: null,
                band_color: null,
                other_text: e.target.value,
              })
            }
            className={cn('h-8', compact && 'h-7 text-xs px-1.5')}
            aria-label="Altra attrezzatura"
          />
        )}
      </div>
    </div>
  );
}
