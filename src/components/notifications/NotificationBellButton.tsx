import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

// =====================================================
// Bell + unread badge — same UX as athlete AppHeader
// =====================================================

interface NotificationBellButtonProps {
  to: string;
  className?: string;
}

export function NotificationBellButton({ to, className }: NotificationBellButtonProps) {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Notifiche"
      className={cn(
        'relative text-app-foreground hover:text-app-accent hover:bg-app-muted',
        className,
      )}
      onClick={() => navigate(to)}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-app-accent text-[10px] font-bold text-black">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Button>
  );
}

export default NotificationBellButton;
