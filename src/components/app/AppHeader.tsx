import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

// =====================================================
// APP HEADER - Header per pagine app mobile
// Design: avatar + week calendar o titolo
// =====================================================

interface AppHeaderProps {
  title?: string;
  avatarUrl?: string;
  avatarInitials?: string;
  showNotifications?: boolean;
  notificationCount?: number;
  onAvatarPress?: () => void;
  onNotificationPress?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export function AppHeader({
  title,
  avatarUrl,
  avatarInitials = 'U',
  showNotifications = false,
  notificationCount = 0,
  onAvatarPress,
  onNotificationPress,
  children,
  className,
}: AppHeaderProps) {
  return (
    <header className={cn('px-4 pt-4 pb-2', className)}>
      <div className="flex items-center justify-between">
        {/* Avatar */}
        <button onClick={onAvatarPress} className="flex-shrink-0">
          <Avatar className="h-14 w-14 ring-2 ring-app-accent/50">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="bg-gray-800 text-app-accent text-lg font-bold">
              {avatarInitials}
            </AvatarFallback>
          </Avatar>
        </button>

        {/* Center Content / Title */}
        {title ? (
          <h1 className="text-lg font-bold text-white">{title}</h1>
        ) : children ? (
          <div className="flex-1 mx-4">{children}</div>
        ) : null}

        {/* Notifications */}
        {showNotifications && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative text-white/60 hover:text-white"
            onClick={onNotificationPress}
          >
            <Bell className="h-6 w-6" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-app-accent text-[10px] font-bold text-black">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </Button>
        )}
      </div>
    </header>
  );
}

// =====================================================
// SIMPLE HEADER - Header semplice con back e titolo
// =====================================================

interface SimpleHeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  className?: string;
}

export function SimpleHeader({
  title,
  onBack,
  rightAction,
  className,
}: SimpleHeaderProps) {
  return (
    <header className={cn(
      'sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-black/90 backdrop-blur-lg border-b border-white/10',
      className
    )}>
      {onBack ? (
        <Button variant="ghost" size="icon" onClick={onBack} className="text-white">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
      ) : (
        <div className="w-10" />
      )}
      
      <h1 className="text-lg font-bold text-white">{title}</h1>
      
      {rightAction || <div className="w-10" />}
    </header>
  );
}

export default AppHeader;
