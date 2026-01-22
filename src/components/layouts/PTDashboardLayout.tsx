import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  Dumbbell, 
  Calendar,
  MessageSquare,
  CreditCard,
  Settings, 
  LogOut,
  ChevronRight,
  Bell,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// =====================================================
// PT DASHBOARD LAYOUT - Dashboard Web PT
// Solo per ruolo: pt
// =====================================================

interface PTDashboardLayoutProps {
  children: ReactNode;
}

const navigationItems = [
  { 
    label: 'Dashboard', 
    href: '/pt', 
    icon: LayoutDashboard,
    exact: true 
  },
  { 
    label: 'Atleti', 
    href: '/pt/athletes', 
    icon: Users 
  },
  { 
    label: 'Allenamenti', 
    href: '/pt/workouts', 
    icon: Dumbbell 
  },
  { 
    label: 'Calendario', 
    href: '/pt/calendar', 
    icon: Calendar 
  },
  { 
    label: 'Messaggi', 
    href: '/pt/messages', 
    icon: MessageSquare 
  },
  { 
    label: 'Pagamenti', 
    href: '/pt/payments', 
    icon: CreditCard 
  },
  { 
    label: 'Impostazioni', 
    href: '/pt/settings', 
    icon: Settings 
  },
];

export function PTDashboardLayout({ children }: PTDashboardLayoutProps) {
  const location = useLocation();
  const { signOut, user } = useAuth();

  const isActiveRoute = (href: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background" data-role="pt">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-sidebar">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-sidebar-border px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg role-indicator-pt">
                <Dumbbell className="h-5 w-5 text-role-pt-foreground" />
              </div>
              <div>
                <span className="text-sm font-semibold">PT Dashboard</span>
                <span className="block text-xs text-muted-foreground">Personal Trainer</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navigationItems.map((item) => {
              const isActive = isActiveRoute(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'bg-role-pt/10 text-role-pt font-medium'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {isActive && (
                    <ChevronRight className="ml-auto h-4 w-4" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* App link */}
          <div className="px-4 pb-2">
            <Link 
              to="/pt/app"
              className="flex items-center gap-3 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Smartphone className="h-4 w-4" />
              Apri App PT
            </Link>
          </div>

          {/* User section */}
          <div className="border-t border-sidebar-border p-4">
            <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-role-pt text-role-pt-foreground text-sm font-medium">
                PT
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Personal Trainer</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full mt-2 justify-start text-muted-foreground"
              onClick={signOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Esci
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur px-6">
          <div>
            <h1 className="text-lg font-semibold">Dashboard PT</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                5
              </span>
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default PTDashboardLayout;
