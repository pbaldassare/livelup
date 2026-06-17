import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

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
  /** Quando true il contenuto è scollabile con padding ridotto laterale */
  flush?: boolean;
  children: ReactNode;
  className?: string;
}

export function PTAppPageShell({
  title,
  description,
  actions,
  flush = false,
  children,
  className,
}: PTAppPageShellProps) {
  return (
    <div className={cn('min-h-full overflow-x-hidden', className)}>
      <header className="sticky top-0 z-30 safe-top bg-app-background/95 backdrop-blur border-b border-app-border">
        <div className="flex items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-app-foreground truncate">{title}</h1>
            {description && (
              <p className="text-xs text-app-muted-foreground line-clamp-2">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </div>
      </header>

      <div className={cn(flush ? 'px-0' : 'px-3', 'pt-3 pb-24 overflow-x-hidden')}>
        {children}
      </div>
    </div>
  );
}

export default PTAppPageShell;
