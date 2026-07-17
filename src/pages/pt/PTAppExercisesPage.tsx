import PTExercisesArchivePage from './PTExercisesArchivePage';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';

export function PTAppExercisesPage() {
  return (
    <PTAppPageShell title="Esercizi" description="Archivio pubblico e personali" showBack backTo="/pt/app">
      <PTExercisesArchivePage embedded />
    </PTAppPageShell>
  );
}

export default PTAppExercisesPage;
