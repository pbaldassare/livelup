import type { CSSProperties } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  normalizeTrainingModality,
  trainingModalityLabel,
  type TrainingModality,
} from '@/lib/trainingModality';
import { cn } from '@/lib/utils';
import { MapPin, Monitor, Combine, Tag } from 'lucide-react';

const SYSTEM_STYLES: Record<TrainingModality, string> = {
  in_presenza: 'bg-sky-500/10 text-sky-700 border-sky-500/25 dark:text-sky-300',
  online: 'bg-violet-500/10 text-violet-700 border-violet-500/25 dark:text-violet-300',
  mix: 'bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-300',
};

const SYSTEM_ICONS: Record<TrainingModality, typeof MapPin> = {
  in_presenza: MapPin,
  online: Monitor,
  mix: Combine,
};

interface Props {
  name?: string | null;
  color?: string | null;
  slug?: string | null;
  isSystem?: boolean | null;
  /** Legacy fallback when category join not available */
  modality?: string | null;
  className?: string;
  showIcon?: boolean;
}

function styleFromColor(color: string | null | undefined): CSSProperties | undefined {
  if (!color) return undefined;
  return {
    backgroundColor: `${color}22`,
    borderColor: `${color}66`,
    color,
  };
}

export function AthleteCategoryBadge({
  name,
  color,
  slug,
  isSystem,
  modality,
  className,
  showIcon = true,
}: Props) {
  const systemSlug =
    isSystem && (slug === 'in_presenza' || slug === 'online' || slug === 'mix')
      ? slug
      : modality
        ? normalizeTrainingModality(modality)
        : null;

  const label =
    name?.trim() ||
    (systemSlug ? trainingModalityLabel(systemSlug) : null) ||
    trainingModalityLabel(modality);

  const Icon = systemSlug ? SYSTEM_ICONS[systemSlug] : Tag;
  const systemClass = systemSlug ? SYSTEM_STYLES[systemSlug] : 'bg-muted text-muted-foreground border-border';
  const customStyle = !systemSlug ? styleFromColor(color) : undefined;

  return (
    <Badge
      variant="outline"
      className={cn('text-xs gap-1 font-medium', !customStyle && systemClass, className)}
      style={customStyle}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {label}
    </Badge>
  );
}
