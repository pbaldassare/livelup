import PTBlogPage from './PTBlogPage';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';

export function PTAppBlogPage() {
  return (
    <PTAppPageShell title="Blog & Q&A" description="Crea articoli, curiosità e rispondi alle domande" showBack>
      <PTBlogPage embedded />
    </PTAppPageShell>
  );
}

export default PTAppBlogPage;
