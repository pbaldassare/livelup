import PTPaymentsPage from './PTPaymentsPage';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';

export function PTAppPaymentsPage() {
  return (
    <PTAppPageShell title="Pagamenti" description="Abbonamento e storico pagamenti">
      <PTPaymentsPage embedded />
    </PTAppPageShell>
  );
}

export default PTAppPaymentsPage;
