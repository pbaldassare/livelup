import { PTAppPageShell } from '@/components/app/PTAppPageShell';
import { NotificationsInbox } from '@/components/notifications/NotificationsInbox';

// =====================================================
// PT PWA — inbox notifiche (stesso hook dell'app / dropdown web)
// =====================================================

export function PTAppNotificationsPage() {
  return (
    <PTAppPageShell
      title="Notifiche"
      description="Messaggi, richieste e aggiornamenti"
      showBack
      showNotifications={false}
      backTo="/pt/app"
    >
      <NotificationsInbox />
    </PTAppPageShell>
  );
}

export default PTAppNotificationsPage;
