import { useNotifications, type Notification } from '@/hooks/useNotifications';
import { useNotificationNavigation } from '@/hooks/useNotificationNavigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, Check, Trash2, UserPlus, MessageSquare, Calendar, CreditCard, Dumbbell, Award, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

// =====================================================
// COMPONENT: Notification Dropdown
// Per header/navbar (PT web + Admin)
// =====================================================

const notificationIcons: Record<string, typeof Bell> = {
  connection_request: UserPlus,
  connection: UserPlus,
  connection_accepted: Check,
  message: MessageSquare,
  event: Calendar,
  event_registration: Calendar,
  event_comment: MessageSquare,
  booking: Calendar,
  payment: CreditCard,
  workout: Dumbbell,
  workout_assigned: Dumbbell,
  badge: Award,
  review: Star,
};

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    isLoading,
    isError,
    refetch,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();
  const { openNotification } = useNotificationNavigation();

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) markAsRead(notification.id);
    setOpen(false);
    await openNotification(notification);
  };

  const getIcon = (type: string) => notificationIcons[type] || Bell;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifiche">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifiche</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs"
              onClick={() => markAllAsRead()}
            >
              Segna tutte come lette
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Caricamento notifiche…
          </div>
        ) : isError ? (
          <div className="p-4 text-center space-y-2">
            <p className="text-sm text-muted-foreground">Impossibile caricare le notifiche.</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs"
              onClick={() => refetch()}
            >
              Riprova
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Nessuna notifica
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            {notifications.map((notification) => {
              const Icon = getIcon(notification.type);
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    'group flex items-start gap-3 p-3 cursor-pointer',
                    !notification.is_read && 'bg-muted/50'
                  )}
                  onSelect={(e) => {
                    e.preventDefault();
                    handleNotificationClick(notification);
                  }}
                >
                  <div className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    !notification.is_read ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {notification.title}
                    </p>
                    {notification.body && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.body}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(notification.created_at).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationDropdown;
