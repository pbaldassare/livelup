import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Home,
  Dumbbell,
  MessageSquare,
  User,
  Search,
  Users,
  CalendarDays,
  Sparkles,
  MoreHorizontal,
} from 'lucide-react';
import { RequireUserName } from '@/components/auth/RequireUserName';
import { InstallBanner } from '@/components/pwa/InstallBanner';
import { PTMoreDrawer } from '@/components/app/PTMoreDrawer';

// =====================================================
// APP LAYOUT - Mobile/PWA Layout
// Per: PT (app) e Atleta (app)
// =====================================================

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { isPT } = usePermissions();

  // Enable realtime notifications
  useRealtimeNotifications();

  // PT bottom-nav: 4 link primari + un trigger "Più" che apre PTMoreDrawer
  // con tutte le altre sezioni (Calendario, Esercizi, Template, Coupons,
  // Pagamenti, Blog, Profilo, Impostazioni, Logout).
  const navigationItems = isPT
    ? [
        { label: 'Home', href: '/pt/app', icon: Home, exact: true },
        { label: 'Atleti', href: '/pt/app/athletes', icon: Users },
        { label: 'Schede', href: '/pt/app/templates', icon: Dumbbell },
        { label: 'Chat', href: '/pt/app/chat', icon: MessageSquare },
      ]
    : [
        { label: 'Home', href: '/app', icon: Home, exact: true },
        { label: 'Programma', href: '/app/programma', icon: CalendarDays },
        { label: 'Attività', href: '/app/attivita', icon: Sparkles },
        { label: 'Scopri', href: '/app/discover', icon: Search },
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
      className="min-h-screen bg-app-background flex flex-col overflow-x-hidden"
      data-role={roleClass}
    >
      {/* Main content — no opacity page transitions (causavano pagina bianca al remount route) */}
      <main className="flex-1 pb-20 safe-top text-app-foreground min-h-0 overflow-x-hidden">
        <div className="h-full">
          <RequireUserName>{children}</RequireUserName>
        </div>
      </main>

      {/* Bottom navigation - mobile style */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-app-border bg-app-card/95 backdrop-blur safe-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {navigationItems.map((item) => {
            const isActive = isActiveRoute(item.href, item.exact);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] transition-colors',
                  isActive ? 'text-app-accent' : 'text-app-muted-foreground',
                )}
              >
                <motion.div whileTap={{ scale: 0.9 }} transition={{ duration: 0.1 }}>
                  <item.icon
                    className={cn('h-5 w-5 transition-transform', isActive && 'scale-110')}
                  />
                </motion.div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}

          {isPT && (
            <PTMoreDrawer
              trigger={
                <button
                  type="button"
                  className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] text-app-muted-foreground transition-colors"
                  aria-label="Apri altre sezioni"
                >
                  <MoreHorizontal className="h-5 w-5" />
                  <span className="text-[10px] font-medium">Più</span>
                </button>
              }
            />
          )}
        </div>
      </nav>

      <InstallBanner />
    </div>
  );
}

export default AppLayout;
