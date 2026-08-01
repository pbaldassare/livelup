import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfficialBadgeProps {
  className?: string;
}

export function OfficialBadge({ className }: OfficialBadgeProps) {
  return (
    <Badge
      className={cn(
        'bg-amber-500/20 text-amber-400 border-amber-500/40 gap-1',
        className,
      )}
      variant="outline"
    >
      <ShieldCheck className="h-3 w-3" />
      Ufficiale Livelapp
    </Badge>
  );
}
