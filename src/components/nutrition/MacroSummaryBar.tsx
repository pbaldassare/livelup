import { macroProgress } from '@/lib/nutritionMacros';
import type { MacroTotals } from '@/types/nutrition';
import { cn } from '@/lib/utils';

interface MacroSummaryBarProps {
  actual: MacroTotals;
  target: MacroTotals;
  className?: string;
}

function Bar({ label, actual, target, unit }: { label: string; actual: number; target: number; unit: string }) {
  const pct = macroProgress(actual, target);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-app-muted-foreground">
        <span>{label}</span>
        <span>
          {Math.round(actual)}
          {unit} / {target}
          {unit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-app-muted/40 overflow-hidden">
        <div
          className="h-full rounded-full bg-app-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function MacroSummaryBar({ actual, target, className }: MacroSummaryBarProps) {
  return (
    <div className={cn('space-y-3 rounded-2xl border border-app-border bg-app-card p-4', className)}>
      <Bar label="Calorie" actual={actual.kcal} target={target.kcal} unit="" />
      <Bar label="Proteine" actual={actual.protein_g} target={target.protein_g} unit="g" />
      <Bar label="Carboidrati" actual={actual.carbs_g} target={target.carbs_g} unit="g" />
      <Bar label="Grassi" actual={actual.fat_g} target={target.fat_g} unit="g" />
    </div>
  );
}
