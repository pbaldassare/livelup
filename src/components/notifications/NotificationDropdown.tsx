import { useLocation, useNavigate } from 'react-router-dom';
import { useNotifications, type Notification } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, Check, Trash2, UserPlus, MessageSquare, Calendar, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

// =====================================================
// COMPONENT: Notification Dropdown
// Per header/navbar
// =====================================================

const notificationIcons: Record<string, typeof Bell> = {
  connection_request: UserPlus,
  connection: UserPlus,
  connection_accepted: Check,
  message: MessageSquare,
  event: Calendar,
  payment: CreditCard,
};

function extractChatId(n: Notification): string | null {
  const fromData =
    n.data && typeof n.data === 'object' ? (n.data as Record<string, unknown>).chat_id : null;
  if (typeof fromData === 'string' && fromData) return fromData;
  if (n.action_url) {
    const m = n.action_url.match(/\/(?:chat|messages)\/([0-9a-fA-F-]{8,})/);
    if (m) return m[1];
  }
  return null;
}

export function NotificationDropdown() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const resolveChatRoute = async (chatId: string): Promise<string | null> => {
    if (!user?.id) return null;
    const { data, error } = await supabase
      .from('chats')
      .select('pt_user_id, atleta_user_id')
      .eq('id', chatId)
      .maybeSingle();
    if (error || !data) return null;

    const otherUserId =
      data.pt_user_id === user.id ? data.atleta_user_id : data.pt_user_id;

    if (role === 'atleta') {
      return `/app/chat/${otherUserId}`;
    }
    if (role === 'pt') {
      // PT can be in the dashboard (/pt/...) or in the PT PWA (/pt/app/...)
      const inPwa = location.pathname.startsWith('/pt/app');
      return inPwa
        ? `/pt/app/chat/${otherUserId}`
        : `/pt/messages?athlete=${otherUserId}`;
    }
    return null;
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) markAsRead(notification.id);
    setOpen(false);

    const isMessage =
      notification.type === 'message' ||
      (notification.action_url || '').includes('/messages/') ||
      (notification.action_url || '').includes('/chat/');

    if (isMessage) {
      const chatId = extractChatId(notification);
      if (chatId) {
        const route = await resolveChatRoute(chatId);
        if (route) {
          navigate(route);
          return;
        }
      }
    }

    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const getIcon = (type: string) => notificationIcons[type] || Bell;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
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

        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Nessuna notifica
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            {notifications.slice(0, 10).map((notification) => {
              const Icon = getIcon(notification.type);
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-3 p-3 cursor-pointer',
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
