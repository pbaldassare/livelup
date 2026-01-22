import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { cn } from '@/lib/utils';
import { 
  Home, 
  Dumbbell, 
  TrendingUp, 
  MessageSquare, 
  User,
  Search,
  Users
} from 'lucide-react';

// =====================================================
// APP LAYOUT - Mobile/PWA Layout
// Per: PT (app) e Atleta (app)
// =====================================================

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { isPT, isAtleta } = usePermissions();
  
  // Enable realtime notifications
  useRealtimeNotifications();

  // Navigation items based on role
  const navigationItems = isPT
    ? [
        { label: 'Home', href: '/pt/app', icon: Home, exact: true },
        { label: 'Atleti', href: '/pt/app/athletes', icon: Users },
        { label: 'Schede', href: '/pt/app/workouts', icon: Dumbbell },
        { label: 'Chat', href: '/pt/app/chat', icon: MessageSquare },
        { label: 'Profilo', href: '/pt/app/profile', icon: User },
      ]
    : [
        { label: 'Home', href: '/app', icon: Home, exact: true },
        { label: 'Workout', href: '/app/workout', icon: Dumbbell },
        { label: 'Scopri', href: '/app/discover', icon: Search },
        { label: 'Progressi', href: '/app/progress', icon: TrendingUp },
        { label: 'Profilo', href: '/app/profile', icon: User },
      ];

  const isActiveRoute = (href: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  const roleClass = isPT ? 'pt' : 'atleta';

  return (
    <div 
      className="min-h-screen bg-background flex flex-col" 
      data-role={roleClass}
    >
      {/* Main content area - leaves space for bottom nav */}
      <main className="flex-1 pb-20 safe-top">
        {children}
      </main>

      {/* Bottom navigation - mobile style */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur safe-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {navigationItems.map((item) => {
            const isActive = isActiveRoute(item.href, item.exact);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                <item.icon className={cn(
                  'h-5 w-5 transition-transform',
                  isActive && 'scale-110'
                )} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default AppLayout;
