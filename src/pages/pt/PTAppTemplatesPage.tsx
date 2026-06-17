import PTWorkoutsPage from './PTWorkoutsPage';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';

// /pt/app/templates è un alias visivo della stessa pagina Allenamenti.
export function PTAppTemplatesPage() {
  return (
    <PTAppPageShell title="Template" description="Schede di allenamento riutilizzabili">
      <PTWorkoutsPage embedded />
    </PTAppPageShell>
  );
}

export default PTAppTemplatesPage;
