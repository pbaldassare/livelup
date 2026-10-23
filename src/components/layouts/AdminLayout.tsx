import { ReactNode, useState, useRef, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminStats } from '@/hooks/useAdminStats';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  UserCog,
  CreditCard,
  Receipt,
  Tag,
  HeadphonesIcon,
  MessageSquare,
  Settings,
  LogOut,
  Map,
  Library,
  Layers,
  BarChart3,
  ShieldCheck,
  UsersRound,
  BookOpen,
  Lightbulb,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { Logo } from '@/components/common/Logo';
import { RequireUserName } from '@/components/auth/RequireUserName';
import { useIsMobile } from '@/hooks/use-mobile';

// =====================================================
// ADMIN LAYOUT - Dashboard Web Admin
// Design: Sidebar teal, cards bianche; drawer su mobile
// =====================================================

interface AdminLayoutProps {
  children: ReactNode;
}

type AdminNavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  tourId?: string;
  showPtFeedbackPendingBadge?: boolean;
};

const navigationItems: AdminNavItem[] = [
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
    label: 'Report billing',
    href: '/admin/billing',
    icon: BarChart3,
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
    icon: Tag,
  },
  {
    label: 'Suggerimenti PT',
    href: '/admin/pt-feedback',
    icon: Lightbulb,
    showPtFeedbackPendingBadge: true,
  },
  {
    label: 'Catalogo Coupon',
    href: '/admin/coupon-templates',
    icon: Layers,
  },
  {
    label: 'Archivio Esercizi',
    href: '/admin/exercises',
    icon: Library,
  },
  {
    label: 'Corsi',
    href: '/admin/courses',
    icon: LayoutDashboard,
  },
  {
    label: 'Blog & Q&A',
    href: '/admin/blog',
    icon: BookOpen,
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
    icon: Settings,
  },
  {
    label: 'Stato PT',
    href: '/admin/pt-readiness',
    icon: UserCog,
  },
  {
    label: 'Audit & Coerenza',
    href: '/admin/audit',
    icon: ShieldCheck,
  },
  {
    label: 'Sitemap',
    href: '/admin/sitemap',
    icon: Map,
  },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { data: adminStats } = useAdminStats();
  const ptFeedbackPending = adminStats?.pt_feedback_pending_replies ?? 0;
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY.current);

      if (!sidebarOpen && touchStartX.current < 80 && deltaX > 50 && deltaY < 80) {
        setSidebarOpen(true);
      }
      if (sidebarOpen && deltaX < -60 && deltaY < 80) {
        setSidebarOpen(false);
      }
      touchStartX.current = null;
      touchStartY.current = null;
    },
    [sidebarOpen],
  );

  useEffect(() => {
    if (!isMobile) return;
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, handleTouchStart, handleTouchEnd]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const isActiveRoute = (href: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Logo variant="icon" className="h-9 w-9 rounded-lg" />
          <div>
            <span className="text-base font-semibold">Livelapp</span>
            <span className="block text-xs text-white/60 uppercase tracking-wider">Admin</span>
          </div>
        </div>
        {isMobile && (
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="p-1 text-white/70 hover:text-white"
            aria-label="Chiudi menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const isActive = isActiveRoute(item.href, item.exact);
            return (
              <Link
                key={item.href}
                to={item.href}
                data-tour={item.tourId}
                onClick={() => isMobile && setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
                  isActive
                    ? 'bg-white text-[#0d4f4f] font-medium shadow-sm'
                    : 'text-white/80 hover:bg-white/10 hover:text-white',
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.showPtFeedbackPendingBadge && ptFeedbackPending > 0 && (
                  <span
                    className={cn(
                      'min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums',
                      isActive ? 'bg-[#0d4f4f]/15 text-[#0d4f4f]' : 'bg-white/20 text-white',
                    )}
                    aria-label={`${ptFeedbackPending} da rispondere`}
                  >
                    {ptFeedbackPending > 99 ? '99+' : ptFeedbackPending}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

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
  );

  return (
    <div className="min-h-screen bg-muted/30" data-role="admin">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 bg-[#0d4f4f] text-white md:block">
        {sidebarContent}
      </aside>

      {isMobile && (
        <>
          {sidebarOpen && (
            <motion.div
              className="fixed inset-0 z-50 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSidebarOpen(false)}
              aria-hidden
            />
          )}
          <motion.aside
            className="fixed left-0 top-0 z-50 h-screen w-[min(16rem,85vw)] max-w-64 bg-[#0d4f4f] text-white shadow-xl"
            initial={{ x: '-100%' }}
            animate={{ x: sidebarOpen ? 0 : '-100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            {sidebarContent}
          </motion.aside>
        </>
      )}

      <div className="md:pl-64 overflow-x-hidden">
        <header
          className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background px-4 md:px-6 pt-[var(--sat)]"
        >
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground"
              onClick={() => setSidebarOpen(true)}
              aria-label="Apri menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="truncate text-sm font-semibold text-foreground md:hidden">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <NotificationDropdown />
          </div>
        </header>

        <main className="p-4 pb-[max(1rem,var(--sab))] md:p-6">
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
