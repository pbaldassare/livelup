import { Button } from '@/components/ui/button';
import {
  ATHLETE_RELATION_OPTIONS,
  type AthleteRelationFilterValue,
} from '@/hooks/useAthleteRelations';
import { cn } from '@/lib/utils';

type Props = {
  value: AthleteRelationFilterValue;
  onChange: (value: AthleteRelationFilterValue) => void;
  className?: string;
};

/** Unica riga di filtro "Relazione" (Tutti / Titolare / In coaching / Ceduti). */
export function AthleteRelationFilter({ value, onChange, className }: Props) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="text-xs text-muted-foreground mr-1">Relazione</span>
      {ATHLETE_RELATION_OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          type="button"
          size="sm"
          variant={value === opt.value ? 'default' : 'outline'}
          className="h-8 text-xs"
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
