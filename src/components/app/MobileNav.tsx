import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LucideIcon, Dumbbell, MessageSquare, Users, User, Zap, Home, Search, Calendar, TrendingUp, CalendarDays } from 'lucide-react';

// =====================================================
// MOBILE BOTTOM NAVIGATION - Navigazione app mobile
// Design: dark theme, accent lime, icons with labels
// =====================================================

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  badge?: number;
  tourId?: string;
}

interface MobileNavProps {
  role: 'atleta' | 'pt';
}

const atletaNavItems: NavItem[] = [
  { icon: Home, label: 'Home', path: '/app', tourId: 'nav-home' },
  { icon: Search, label: 'Scopri', path: '/app/discover', tourId: 'nav-discover' },
  { icon: Dumbbell, label: 'Attività', path: '/app/workout', tourId: 'nav-workout' },
  { icon: CalendarDays, label: 'Prenota', path: '/app/booking', tourId: 'nav-booking' },
  { icon: User, label: 'Profilo', path: '/app/profile', tourId: 'nav-profile' },
];

const ptNavItems: NavItem[] = [
  { icon: Home, label: 'Home', path: '/pt/app', tourId: 'nav-pt-home' },
  { icon: Users, label: 'Atleti', path: '/pt/app/athletes', tourId: 'nav-pt-athletes' },
  { icon: Calendar, label: 'Calendario', path: '/pt/app/calendar', tourId: 'nav-pt-calendar' },
  { icon: Dumbbell, label: 'Schede', path: '/pt/app/workouts', tourId: 'nav-pt-workouts' },
  { icon: User, label: 'Profilo', path: '/pt/app/profile', tourId: 'nav-pt-profile' },
];

export function MobileNav({ role }: MobileNavProps) {
  const location = useLocation();
  const items = role === 'atleta' ? atletaNavItems : ptNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-lg border-t border-white/10 safe-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/app' && item.path !== '/pt/app' && location.pathname.startsWith(item.path));
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              data-tour={item.tourId}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-[60px]',
                isActive 
                  ? 'text-app-accent' 
                  : 'text-white/60 hover:text-white/80'
              )}
            >
              <div className="relative">
                <item.icon className={cn('h-5 w-5', isActive && 'stroke-[2.5px]')} />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-app-accent text-[10px] font-bold text-black">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={cn(
                'text-[10px] font-medium',
                isActive && 'font-semibold'
              )}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileNav;
