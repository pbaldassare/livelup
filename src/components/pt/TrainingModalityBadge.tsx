import { AthleteCategoryBadge } from '@/components/pt/AthleteCategoryBadge';

interface Props {
  modality?: string | null;
  name?: string | null;
  color?: string | null;
  slug?: string | null;
  isSystem?: boolean | null;
  className?: string;
  showIcon?: boolean;
}

/** Badge categoria cliente (compat con prop legacy `modality`). */
export function TrainingModalityBadge({
  modality,
  name,
  color,
  slug,
  isSystem,
  className,
  showIcon = true,
}: Props) {
  return (
    <AthleteCategoryBadge
      modality={modality}
      name={name}
      color={color}
      slug={slug}
      isSystem={isSystem}
      className={className}
      showIcon={showIcon}
    />
  );
}
