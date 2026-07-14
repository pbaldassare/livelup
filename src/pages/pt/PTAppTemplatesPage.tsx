import PTWorkoutsPage from './PTWorkoutsPage';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';

// /pt/app/templates è un alias visivo della stessa pagina Allenamenti.
export function PTAppTemplatesPage() {
  return (
    <PTAppPageShell title="Template" description="Schede di allenamento riutilizzabili">
      <div data-tour="pt-workouts-page">
        <PTWorkoutsPage embedded />
      </div>
    </PTAppPageShell>
  );
}

export default PTAppTemplatesPage;
