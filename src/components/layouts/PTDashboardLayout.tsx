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
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/common/Logo';

// =====================================================
// PT DASHBOARD LAYOUT - Dashboard Web PT
// Design: Sidebar teal, cards bianche, layout pulito
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

  // Fetch profile for display
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const isActiveRoute = (href: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  const displayName = profile 
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Personal Trainer'
    : 'Personal Trainer';
    
  const initials = profile
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`
    : 'PT';

  return (
    <div className="min-h-screen bg-muted/30" data-role="pt">
      {/* Sidebar - Stile teal scuro */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-[#0d4f4f] text-white">
        <div className="flex h-full flex-col">
          {/* Logo & Brand */}
          <div className="flex h-16 items-center px-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <Logo variant="icon" className="h-9 w-9 rounded-lg" />
              <div>
                <span className="text-base font-semibold">LIVELLAPP</span>
                <span className="block text-xs text-white/60 uppercase tracking-wider">Personal Trainer</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-3 overflow-y-auto">
            <div className="space-y-1">
              {navigationItems.map((item) => {
                const isActive = isActiveRoute(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
                      isActive
                        ? 'bg-white text-[#0d4f4f] font-medium shadow-sm'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* App link */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <Link 
                to="/pt/app"
                className="flex items-center gap-3 rounded-lg border border-dashed border-white/30 px-3 py-2.5 text-sm text-white/70 hover:border-white/50 hover:text-white transition-colors"
              >
                <Smartphone className="h-4 w-4" />
                <span>Apri App PT</span>
              </Link>
            </div>
          </nav>

          {/* User section */}
          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white text-sm font-medium">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{displayName}</p>
                <p className="text-xs text-white/60 truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10"
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
        <header className="sticky top-0 z-30 flex h-14 items-center justify-end border-b border-border bg-white px-6">
          <div className="flex items-center gap-3">
            <NotificationDropdown />
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
