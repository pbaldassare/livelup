import { SectionCard } from '@/components/dashboard/SectionCard';
import { History } from 'lucide-react';
import { WorkoutHistoryList } from '@/components/shared/WorkoutHistoryList';

interface Props {
  atletaUserId: string;
  ptUserId: string;
}

export function PTAthleteHistoryTab({ atletaUserId, ptUserId }: Props) {
  return (
    <SectionCard
      title="Storico allenamenti"
      subtitle="Tutti gli allenamenti completati con il dettaglio per serie"
      icon={History}
      iconColor="primary"
    >
      <WorkoutHistoryList atletaUserId={atletaUserId} ptUserId={ptUserId} variant="pt" />
    </SectionCard>
  );
}

export default PTAthleteHistoryTab;
