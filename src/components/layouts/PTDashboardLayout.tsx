import { ReactNode, useState, useRef, useCallback, useEffect } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  Dumbbell, 
  Calendar,
  MessageSquare,
  CreditCard,
  Settings, 
  LogOut,
  Smartphone,
  BookOpen,
  Menu,
  X,
  Tag,
  Library
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/common/Logo';
import { useIsMobile } from '@/hooks/use-mobile';
import { RequireUserName } from '@/components/auth/RequireUserName';
import { InstallBanner } from '@/components/pwa/InstallBanner';

interface PTDashboardLayoutProps {
  children: ReactNode;
}

const navigationItems = [
  { label: 'Dashboard', href: '/pt', icon: LayoutDashboard, exact: true },
  { label: 'Atleti', href: '/pt/athletes', icon: Users },
  { label: 'Allenamenti', href: '/pt/workouts', icon: Dumbbell },
  { label: 'Archivio Esercizi', href: '/pt/exercises', icon: Library },
  { label: 'Cal. Eventi', href: '/pt/calendar/eventi', icon: Calendar },
  { label: 'Cal. Appuntamenti', href: '/pt/calendar/appuntamenti', icon: Calendar },
  { label: 'Messaggi', href: '/pt/messages', icon: MessageSquare },
  { label: 'Pagamenti', href: '/pt/payments', icon: CreditCard },
  { label: 'Coupon', href: '/pt/coupons', icon: Tag },
  { label: 'Blog', href: '/pt/blog', icon: BookOpen },
  { label: 'Impostazioni', href: '/pt/settings', icon: Settings },
];

export function PTDashboardLayout({ children }: PTDashboardLayoutProps) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    
    // Swipe right to open (start from left edge, >60px horizontal, not too vertical)
    if (!sidebarOpen && touchStartX.current < 80 && deltaX > 50 && deltaY < 80) {
      setSidebarOpen(true);
    }
    // Swipe left to close
    if (sidebarOpen && deltaX < -60 && deltaY < 80) {
      setSidebarOpen(false);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, [sidebarOpen]);

  useEffect(() => {
    if (!isMobile) return;
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, handleTouchStart, handleTouchEnd]);


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

  // Onboarding gate: nuovi PT (status='registrato') vengono indirizzati
  // al wizard prima di poter usare la dashboard.
  const { data: ptStatus, isLoading: ptStatusLoading } = useQuery({
    queryKey: ['pt-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('pt_profiles')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();
      return data?.status ?? null;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  if (!ptStatusLoading && ptStatus === 'registrato' && !location.pathname.startsWith('/pt/onboarding')) {
    return <Navigate to="/pt/onboarding" replace />;
  }

  const isActiveRoute = (href: string, exact?: boolean) => {
    if (exact) return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  const displayName = profile 
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Personal Trainer'
    : 'Personal Trainer';
    
  const initials = profile
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`
    : 'PT';

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Logo variant="icon" className="h-9 w-9 rounded-lg" />
          <div>
            <span className="text-base font-semibold">LIVEL APP</span>
            <span className="block text-xs text-white/60 uppercase tracking-wider">Personal Trainer</span>
          </div>
        </div>
        {isMobile && (
          <button onClick={() => setSidebarOpen(false)} className="p-1 text-white/70 hover:text-white">
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
                onClick={() => isMobile && setSidebarOpen(false)}
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

        <div className="mt-6 pt-4 border-t border-white/10">
          <Link 
            to="/pt/app"
            onClick={() => isMobile && setSidebarOpen(false)}
            className="flex items-center gap-3 rounded-lg border border-dashed border-white/30 px-3 py-2.5 text-sm text-white/70 hover:border-white/50 hover:text-white transition-colors"
          >
            <Smartphone className="h-4 w-4" />
            <span>Apri App PT</span>
          </Link>
        </div>
      </nav>

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
  );

  return (
    <div className="min-h-screen bg-muted/30" data-role="pt">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-[#0d4f4f] text-white hidden md:block">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
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
            />
          )}
          <motion.aside
            className="fixed left-0 top-0 z-50 h-screen w-64 bg-[#0d4f4f] text-white shadow-xl"
            initial={{ x: '-100%' }}
            animate={{ x: sidebarOpen ? 0 : '-100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            {sidebarContent}
          </motion.aside>
        </>
      )}

      {/* Main content */}
      <div className="md:pl-64 overflow-x-hidden">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-white px-4 md:px-6">
          <button
            className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <NotificationDropdown />
          </div>
        </header>

        <main className="p-4 md:p-6">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            <RequireUserName>{children}</RequireUserName>
          </motion.div>
        </main>
      </div>
    </div>
  );
}

export default PTDashboardLayout;
