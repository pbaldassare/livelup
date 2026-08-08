import { useState, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetClose,
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
  UsersRound,
  Users,
  UserPlus,
  ArrowRightLeft,
  Search,
  MapPin,
  Monitor,
  Combine,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface PTMoreDrawerProps {
  trigger: ReactNode;
}

const SECTIONS: Array<{ label: string; href: string; icon: typeof Calendar; group: string }> = [
  { group: 'Rapide', label: 'Atleti', href: '/pt/app/athletes', icon: Users },
  { group: 'Rapide', label: 'Invita atleta', href: '/pt/app/athletes?invite=1', icon: UserPlus },
  { group: 'Atleti per modalità', label: 'In presenza', href: '/pt/app/athletes?modality=in_presenza', icon: MapPin },
  { group: 'Atleti per modalità', label: 'Online', href: '/pt/app/athletes?modality=online', icon: Monitor },
  { group: 'Atleti per modalità', label: 'Mix', href: '/pt/app/athletes?modality=mix', icon: Combine },
  { group: 'Community', label: 'Gruppi', href: '/pt/app/groups', icon: UsersRound },
  { group: 'Community', label: 'Cerca PT e professionisti', href: '/pt/app/cerca-professionisti', icon: Search },
  { group: 'Lavoro', label: 'Calendario', href: '/pt/app/calendar', icon: Calendar },
  { group: 'Lavoro', label: 'Esercizi', href: '/pt/app/exercises', icon: Library },
  { group: 'Lavoro', label: 'Template', href: '/pt/app/templates', icon: ClipboardList },
  { group: 'Lavoro', label: 'Corsi', href: '/pt/app/courses', icon: GraduationCap },
  { group: 'Lavoro', label: 'Collaboratori', href: '/pt/app/collaboratori', icon: UserPlus },
  { group: 'Lavoro', label: 'Cedi atleta', href: '/pt/app/athlete-transfer', icon: ArrowRightLeft },
  { group: 'Business', label: 'Coupons', href: '/pt/app/coupons', icon: Tag },
  { group: 'Business', label: 'Pagamenti', href: '/pt/app/payments', icon: CreditCard },
  { group: 'Business', label: 'Blog & Q&A', href: '/pt/app/blog', icon: BookOpen },
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
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const groups = Array.from(new Set(SECTIONS.map((s) => s.group)));

  const goTo = useCallback(
    (href: string) => {
      setOpen(false);
      navigate(href);
    },
    [navigate],
  );

  const handleSignOut = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setOpen(false);
    try {
      await signOut();
      navigate('/auth', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  }, [signOut, navigate, loggingOut]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="bottom"
        className={cn(
          'z-[60] bg-app-card border-app-border text-app-foreground rounded-t-3xl',
          'max-h-[85vh] overflow-y-auto pb-24 safe-bottom',
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="text-left pr-10">
          <SheetTitle className="text-app-foreground">Altro</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          {groups.map((group) => (
            <div key={group}>
              <p className="text-xs font-medium text-app-muted-foreground uppercase tracking-wider px-2 mb-2">
                {group}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {SECTIONS.filter((s) => s.group === group).map((s) => (
                  <SheetClose key={s.href} asChild>
                    <button
                      type="button"
                      onClick={() => goTo(s.href)}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-app-background border border-app-border hover:border-app-accent/40 active:scale-[0.98] transition-colors"
                    >
                      <s.icon className="h-5 w-5 text-app-accent" />
                      <span className="text-xs font-medium text-center leading-tight text-app-foreground">
                        {s.label}
                      </span>
                    </button>
                  </SheetClose>
                ))}
              </div>
            </div>
          ))}

          <button
            type="button"
            disabled={loggingOut}
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border border-app-border text-app-muted-foreground hover:text-destructive hover:border-destructive/30 active:scale-[0.99] transition-colors disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium">{loggingOut ? 'Uscita…' : 'Esci'}</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default PTMoreDrawer;
