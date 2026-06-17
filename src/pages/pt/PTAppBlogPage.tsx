import PTBlogPage from './PTBlogPage';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';

export function PTAppBlogPage() {
  return (
    <PTAppPageShell title="Blog" description="Crea e gestisci i tuoi articoli">
      <PTBlogPage embedded />
    </PTAppPageShell>
  );
}

export default PTAppBlogPage;
