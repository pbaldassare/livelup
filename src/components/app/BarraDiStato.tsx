import type { ReactNode } from 'react';

/**
 * Copre la fascia della barra di stato nell'app Android (e nella PWA su
 * iPhone): il contenuto che scorre non passa sotto ora e batteria. La usano
 * AppLayout e SchermoPieno; in SchermoPieno le intestazioni sticky si
 * fermano sotto di lei (src/index.css). Sul web --sat vale 0 e non si vede.
 */
export function BarraDiStato() {
  return <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[45] h-[var(--sat)] bg-app-background" />;
}

/** Per le pagine a schermo pieno senza AppLayout (onboarding, allenamento, abbonamento, prenotazione). */
export function SchermoPieno({ children }: { children: ReactNode }) {
  return (
    <div className="schermo-pieno bg-app-background pt-[var(--sat)]">
      <BarraDiStato />
      {children}
    </div>
  );
}
