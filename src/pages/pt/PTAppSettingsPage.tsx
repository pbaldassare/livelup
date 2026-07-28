import PTSettingsPage from './PTSettingsPage';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';
import { ThemePreferencePicker } from '@/components/settings/ThemePreferencePicker';
import { Palette } from 'lucide-react';

export function PTAppSettingsPage() {
  return (
    <PTAppPageShell title="Impostazioni" description="Profilo pubblico e preferenze" showBack>
      <div className="px-4 pb-4 space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-app-muted-foreground" />
          <span className="text-sm font-medium text-app-foreground">Tema</span>
        </div>
        <ThemePreferencePicker compact />
      </div>
      <PTSettingsPage embedded />
    </PTAppPageShell>
  );
}

export default PTAppSettingsPage;
