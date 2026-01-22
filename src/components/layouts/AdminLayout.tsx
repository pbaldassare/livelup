import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  UserCog, 
  CreditCard,
  Receipt,
  Tag,
  HeadphonesIcon,
  Settings, 
  LogOut,
  ChevronRight,
  Bell,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// =====================================================
// ADMIN LAYOUT - Dashboard Web Admin
// Solo per ruolo: admin
// =====================================================

interface AdminLayoutProps {
  children: ReactNode;
}

const navigationItems = [
  { 
    label: 'Dashboard', 
    href: '/admin', 
    icon: LayoutDashboard,
    exact: true 
  },
  { 
    label: 'Personal Trainers', 
    href: '/admin/pts', 
    icon: UserCog 
  },
  { 
    label: 'Atleti', 
    href: '/admin/athletes', 
    icon: Users 
  },
  { 
    label: 'Abbonamenti', 
    href: '/admin/subscriptions', 
    icon: CreditCard 
  },
  { 
    label: 'Pagamenti', 
    href: '/admin/payments', 
    icon: Receipt 
  },
  { 
    label: 'Coupon', 
    href: '/admin/coupons', 
    icon: Tag 
  },
  { 
    label: 'Supporto', 
    href: '/admin/support', 
    icon: HeadphonesIcon 
  },
  { 
    label: 'Impostazioni', 
    href: '/admin/settings', 
    icon: Settings 
  },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const { signOut, user } = useAuth();

  const isActiveRoute = (href: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  // Get page title based on current route
  const getPageTitle = () => {
    const currentItem = navigationItems.find(item => 
      item.exact ? location.pathname === item.href : location.pathname.startsWith(item.href)
    );
    return currentItem?.label ?? 'Dashboard Admin';
  };

  return (
    <div className="min-h-screen bg-background" data-role="admin">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-sidebar">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-sidebar-border px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg role-indicator-admin">
                <Shield className="h-5 w-5 text-role-admin-foreground" />
              </div>
              <div>
                <span className="text-sm font-semibold">Admin Panel</span>
                <span className="block text-xs text-muted-foreground">Enterprise</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
            {navigationItems.map((item) => {
              const isActive = isActiveRoute(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'bg-role-admin/10 text-role-admin font-medium'
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

          {/* User section */}
          <div className="border-t border-sidebar-border p-4">
            <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-role-admin text-role-admin-foreground text-sm font-medium">
                A
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Admin</p>
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
            <h1 className="text-lg font-semibold">{getPageTitle()}</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                3
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

export default AdminLayout;
