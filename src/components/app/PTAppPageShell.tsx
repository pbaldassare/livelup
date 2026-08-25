import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PTBillingBanner } from '@/components/pt/PTBillingBanner';

// =====================================================
// PT APP PAGE SHELL
// Shell mobile uniforme per le pagine PT-PWA:
// - header sticky compatto con titolo + descrizione + slot azioni
// - safe-top per non finire sotto la status-bar in PWA standalone
// - container con padding orizzontale e bottom-padding per la bottom-nav
// - overflow-x-hidden per neutralizzare tabelle/grafici desktop
//
// Le pagine PT web riusate dentro questa shell ricevono prop `embedded`
// per saltare il proprio PageHeader e non duplicare il titolo.
// =====================================================

interface PTAppPageShellProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Mostra pulsante indietro a sinistra nel header */
  showBack?: boolean;
  /** Route esplicita per il back; default navigate(-1) */
  backTo?: string;
  /** Quando true il contenuto è scollabile con padding ridotto laterale */
  flush?: boolean;
  children: ReactNode;
  className?: string;
}

export function PTAppPageShell({
  title,
  description,
  actions,
  showBack = false,
  backTo,
  flush = false,
  children,
  className,
}: PTAppPageShellProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
      return;
    }
    // Prefer history when available; otherwise stay in the PT PWA shell
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/pt/app');
  };

  return (
    <div className={cn('min-h-full overflow-x-hidden', className)}>
      <header className="sticky top-0 z-30 safe-top bg-app-background/95 backdrop-blur border-b border-app-border">
        <div className="flex items-start gap-1 px-2 py-3 sm:px-4">
          {showBack && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-app-foreground hover:text-app-accent"
              aria-label="Indietro"
              onClick={handleBack}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="min-w-0 flex-1 px-1">
            <h1 className="text-lg font-bold text-app-foreground truncate">{title}</h1>
            {description && (
              <p className="text-xs text-app-muted-foreground line-clamp-2">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </div>
      </header>

      <div className={cn(flush ? 'px-0' : 'px-3', 'pt-3 pb-24 overflow-x-hidden')}>
        <PTBillingBanner forceApp />
        {children}
      </div>
    </div>
  );
}

export default PTAppPageShell;
