import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

type ThemeChoice = 'light' | 'dark' | 'system';

const OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Chiaro', icon: Sun },
  { value: 'dark', label: 'Scuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
];

interface ThemePreferencePickerProps {
  className?: string;
  compact?: boolean;
}

export function ThemePreferencePicker({ className, compact }: ThemePreferencePickerProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const active = (theme as ThemeChoice) || 'dark';

  if (!mounted) {
    return (
      <div className={cn('grid grid-cols-3 gap-2', className)}>
        {OPTIONS.map((opt) => (
          <div
            key={opt.value}
            className="h-16 rounded-xl bg-app-muted animate-pulse"
            aria-hidden
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map(({ value, label, icon: Icon }) => {
          const selected = active === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                'flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 transition-colors',
                selected
                  ? 'border-app-accent bg-app-accent/10 text-app-foreground'
                  : 'border-app-border bg-app-muted/50 text-app-muted-foreground hover:border-app-accent/40',
              )}
              aria-pressed={selected}
            >
              <Icon
                className={cn('h-5 w-5', selected ? 'text-app-accent' : 'text-app-muted-foreground')}
              />
              <span className={cn('text-xs font-medium', compact && 'text-[11px]')}>{label}</span>
            </button>
          );
        })}
      </div>
      {active === 'system' && resolvedTheme && (
        <p className="text-[11px] text-app-muted-foreground text-center">
          Tema attivo: {resolvedTheme === 'dark' ? 'Scuro' : 'Chiaro'}
        </p>
      )}
    </div>
  );
}
