import { Link } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Calendar,
  Library,
  ClipboardList,
  Tag,
  CreditCard,
  BookOpen,
  Settings,
  User,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ReactNode } from 'react';

interface PTMoreDrawerProps {
  trigger: ReactNode;
}

const SECTIONS: Array<{ label: string; href: string; icon: typeof Calendar; group: string }> = [
  { group: 'Lavoro', label: 'Calendario', href: '/pt/app/calendar', icon: Calendar },
  { group: 'Lavoro', label: 'Esercizi', href: '/pt/app/exercises', icon: Library },
  { group: 'Lavoro', label: 'Template', href: '/pt/app/templates', icon: ClipboardList },
  { group: 'Business', label: 'Coupons', href: '/pt/app/coupons', icon: Tag },
  { group: 'Business', label: 'Pagamenti', href: '/pt/app/payments', icon: CreditCard },
  { group: 'Business', label: 'Blog', href: '/pt/app/blog', icon: BookOpen },
  { group: 'Account', label: 'Profilo', href: '/pt/app/profile', icon: User },
  { group: 'Account', label: 'Impostazioni', href: '/pt/app/settings', icon: Settings },
];

// =====================================================
// PT MORE DRAWER
// Drawer "Altro" della bottom-nav PT-PWA: raccoglie le
// sezioni avanzate che non stanno nei 5 slot principali.
// =====================================================
export function PTMoreDrawer({ trigger }: PTMoreDrawerProps) {
  const { signOut } = useAuth();

  const groups = Array.from(new Set(SECTIONS.map((s) => s.group)));

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="bottom"
        className="bg-app-card border-app-border text-app-foreground rounded-t-3xl max-h-[85vh] overflow-y-auto"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="text-app-foreground">Altro</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-6 pb-6">
          {groups.map((group) => (
            <div key={group}>
              <p className="text-xs font-medium text-app-muted-foreground uppercase tracking-wider px-2 mb-2">
                {group}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {SECTIONS.filter((s) => s.group === group).map((s) => (
                  <Link
                    key={s.href}
                    to={s.href}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-app-background border border-app-border hover:border-app-accent/40 transition-colors"
                  >
                    <s.icon className="h-5 w-5 text-app-accent" />
                    <span className="text-xs font-medium text-center leading-tight">{s.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border border-app-border text-app-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium">Esci</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default PTMoreDrawer;
