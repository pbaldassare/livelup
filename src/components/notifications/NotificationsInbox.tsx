import {
  Bell,
  Check,
  Trash2,
  UserPlus,
  MessageSquare,
  Calendar,
  CreditCard,
  Dumbbell,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications, type Notification } from '@/hooks/useNotifications';
import { useNotificationNavigation } from '@/hooks/useNotificationNavigation';
import { cn } from '@/lib/utils';

const notificationIcons: Record<string, typeof Bell> = {
  connection_request: UserPlus,
  connection: UserPlus,
  connection_accepted: Check,
  message: MessageSquare,
  event: Calendar,
  payment: CreditCard,
  workout: Dumbbell,
  badge: Award,
};

export function NotificationsInbox() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();
  const { openNotification } = useNotificationNavigation();

  const handleClick = async (notification: Notification) => {
    if (!notification.is_read) markAsRead(notification.id);
    await openNotification(notification);
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-app-muted-foreground">
        Caricamento notifiche…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-xs text-app-accent hover:text-app-accent"
            onClick={() => markAllAsRead()}
          >
            Segna tutte come lette
          </Button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-app-border bg-app-card p-8 text-center">
          <Bell className="mx-auto mb-3 h-8 w-8 text-app-muted-foreground" />
          <p className="text-sm font-medium text-app-foreground">Nessuna notifica</p>
          <p className="mt-1 text-xs text-app-muted-foreground">
            Qui vedi messaggi, richieste e aggiornamenti in tempo reale.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification) => {
            const Icon = notificationIcons[notification.type] || Bell;
            return (
              <li key={notification.id}>
                <div
                  className={cn(
                    'flex items-start gap-3 rounded-2xl border p-3',
                    notification.is_read
                      ? 'border-app-border bg-app-card'
                      : 'border-app-accent/30 bg-app-accent/5',
                  )}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    onClick={() => handleClick(notification)}
                  >
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                        notification.is_read
                          ? 'bg-app-muted text-app-muted-foreground'
                          : 'bg-app-accent/15 text-app-accent',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-medium leading-snug text-app-foreground">
                        {notification.title}
                      </p>
                      {notification.body && (
                        <p className="line-clamp-2 text-xs text-app-muted-foreground">
                          {notification.body}
                        </p>
                      )}
                      <p className="text-[11px] text-app-muted-foreground">
                        {new Date(notification.created_at).toLocaleDateString('it-IT', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Elimina notifica"
                    className="h-8 w-8 shrink-0 text-app-muted-foreground hover:text-destructive"
                    onClick={() => deleteNotification(notification.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default NotificationsInbox;
