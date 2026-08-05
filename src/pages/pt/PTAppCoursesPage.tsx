import PTCoursesPage from './PTCoursesPage';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';

export function PTAppCoursesPage() {
  return (
    <PTAppPageShell title="Corsi" description="Percorsi step-by-step per i tuoi atleti" showBack>
      <PTCoursesPage embedded />
    </PTAppPageShell>
  );
}

export default PTAppCoursesPage;
