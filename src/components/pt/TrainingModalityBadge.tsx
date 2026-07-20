import { Badge } from '@/components/ui/badge';
import {
  normalizeTrainingModality,
  trainingModalityLabel,
  type TrainingModality,
} from '@/lib/trainingModality';
import { cn } from '@/lib/utils';
import { MapPin, Monitor, Combine } from 'lucide-react';

const STYLES: Record<TrainingModality, string> = {
  in_presenza: 'bg-sky-500/10 text-sky-700 border-sky-500/25 dark:text-sky-300',
  online: 'bg-violet-500/10 text-violet-700 border-violet-500/25 dark:text-violet-300',
  mix: 'bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-300',
};

const ICONS: Record<TrainingModality, typeof MapPin> = {
  in_presenza: MapPin,
  online: Monitor,
  mix: Combine,
};

interface Props {
  modality?: string | null;
  className?: string;
  showIcon?: boolean;
}

export function TrainingModalityBadge({ modality, className, showIcon = true }: Props) {
  const value = normalizeTrainingModality(modality);
  const Icon = ICONS[value];

  return (
    <Badge
      variant="outline"
      className={cn('text-xs gap-1 font-medium', STYLES[value], className)}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {trainingModalityLabel(value)}
    </Badge>
  );
}
