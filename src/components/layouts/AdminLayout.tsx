import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  UserCog, 
  CreditCard,
  Receipt,
  Tag,
  HeadphonesIcon,
  MessageSquare,
  Settings, 
  LogOut,
  Map,
  Dumbbell,
  Library,
  Layers,
  ShieldCheck,
  UsersRound,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { Logo } from '@/components/common/Logo';
import { RequireUserName } from '@/components/auth/RequireUserName';

// =====================================================
// ADMIN LAYOUT - Dashboard Web Admin
// Design: Sidebar teal, cards bianche, layout pulito
// =====================================================

interface AdminLayoutProps {
  children: ReactNode;
}

const navigationItems = [
  { 
    label: 'Dashboard', 
    href: '/admin', 
    icon: LayoutDashboard,
    exact: true,
    tourId: 'admin-dashboard',
  },
  { 
    label: 'Personal Trainers', 
    href: '/admin/pts', 
    icon: UserCog,
    tourId: 'admin-nav-pts',
  },
  { 
    label: 'Abbonamenti', 
    href: '/admin/subscriptions', 
    icon: CreditCard,
    tourId: 'admin-nav-subscriptions',
  },
  { 
    label: 'Pagamenti', 
    href: '/admin/payments', 
    icon: Receipt,
    tourId: 'admin-nav-payments',
  },
  { 
    label: 'Messaggi', 
    href: '/admin/messages', 
    icon: MessageSquare,
    tourId: 'admin-nav-messages',
  },
  { 
    label: 'Gruppi', 
    href: '/admin/groups', 
    icon: UsersRound,
    tourId: 'admin-nav-groups',
  },
  { 
    label: 'Coupon', 
    href: '/admin/coupons', 
    icon: Tag 
  },
  { 
    label: 'Catalogo Coupon', 
    href: '/admin/coupon-templates', 
    icon: Layers 
  },
  { 
    label: 'Archivio Esercizi', 
    href: '/admin/exercises', 
    icon: Library 
  },
  { 
    label: 'Corsi', 
    href: '/admin/courses', 
    icon: LayoutDashboard 
  },
  { 
    label: 'Blog & Q&A', 
    href: '/admin/blog', 
    icon: BookOpen 
  },
  { 
    label: 'Supporto', 
    href: '/admin/support', 
    icon: HeadphonesIcon,
    tourId: 'admin-nav-support',
  },
  { 
    label: 'Impostazioni', 
    href: '/admin/settings', 
    icon: Settings 
  },
  { 
    label: 'Stato PT', 
    href: '/admin/pt-readiness', 
    icon: UserCog 
  },
  { 
    label: 'Audit & Coerenza', 
    href: '/admin/audit', 
    icon: ShieldCheck 
  },
  { 
    label: 'Sitemap', 
    href: '/admin/sitemap', 
    icon: Map 
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

  return (
    <div className="min-h-screen bg-muted/30" data-role="admin">
      {/* Sidebar - Stile teal scuro */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-[#0d4f4f] text-white">
        <div className="flex h-full flex-col">
          {/* Logo & Brand */}
          <div className="flex h-16 items-center px-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <Logo variant="icon" className="h-9 w-9 rounded-lg" />
              <div>
                <span className="text-base font-semibold">Livelapp</span>
                <span className="block text-xs text-white/60 uppercase tracking-wider">Admin</span>
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
                    data-tour={item.tourId}
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
          </nav>

          {/* User section */}
          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white text-sm font-medium">
                A
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">Admin</p>
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
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <RequireUserName>{children}</RequireUserName>
          </motion.div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
