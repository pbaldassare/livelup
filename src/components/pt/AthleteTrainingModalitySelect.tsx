import { AthleteCategorySelect } from '@/components/pt/AthleteCategorySelect';

interface Props {
  connectionId: string;
  atletaUserId: string;
  modality?: string | null;
  categoryId?: string | null;
  ptUserId?: string;
  className?: string;
}

/** @deprecated Prefer AthleteCategorySelect — keeps legacy call sites working. */
export function AthleteTrainingModalitySelect({
  connectionId,
  atletaUserId,
  modality,
  categoryId,
  ptUserId,
  className,
}: Props) {
  return (
    <AthleteCategorySelect
      connectionId={connectionId}
      atletaUserId={atletaUserId}
      categoryId={categoryId}
      modality={modality}
      ptUserId={ptUserId}
      className={className}
    />
  );
}
