import { Badge } from '@/components/ui/badge';
import type { AthleteRosterRole, CededMeta } from '@/hooks/usePTAthleteRosterMeta';
import { cn } from '@/lib/utils';

interface Props {
  role: AthleteRosterRole;
  ceded: boolean;
  cededMeta?: CededMeta | null;
  className?: string;
}

export function AthleteRosterBadges({ role, ceded, cededMeta, className }: Props) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {role === 'owner' && (
        <Badge variant="default" className="text-[10px] sm:text-xs">
          Titolare
        </Badge>
      )}
      {role === 'coaching' && (
        <Badge variant="secondary" className="text-[10px] sm:text-xs">
          In coaching
        </Badge>
      )}
      {ceded && (
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] sm:text-xs',
            cededMeta?.is_recallable
              ? 'border-amber-500/40 text-amber-700 dark:text-amber-300'
              : 'border-muted-foreground/30',
          )}
        >
          {cededMeta?.is_recallable ? 'Ceduto · riprendibile' : 'Ceduto'}
        </Badge>
      )}
    </div>
  );
}
