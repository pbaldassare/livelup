import PTSettingsPage from './PTSettingsPage';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';

export function PTAppSettingsPage() {
  return (
    <PTAppPageShell title="Impostazioni" description="Profilo pubblico e preferenze">
      <PTSettingsPage embedded />
    </PTAppPageShell>
  );
}

export default PTAppSettingsPage;
