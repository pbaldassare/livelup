import { RefreshCw, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';
import { cn } from '@/lib/utils';

export function PWAUpdatePrompt() {
  const { isUpdateAvailable, updateServiceWorker } = usePWAUpdate();

  if (!isUpdateAvailable) return null;

  return (
    <div
      className={cn(
        'fixed top-4 left-4 right-4 z-[100] md:left-auto md:right-6 md:max-w-sm',
        'animate-fade-in'
      )}
    >
      <div className="glass rounded-2xl p-4 shadow-lg border border-primary/30 bg-background/95">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Download className="w-5 h-5 text-primary" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">Aggiornamento disponibile</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Una nuova versione di LIVEL APP è pronta per essere installata.
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              <Button 
                size="sm" 
                className="btn-gradient text-white gap-1.5"
                onClick={updateServiceWorker}
              >
                <RefreshCw className="w-4 h-4" />
                Aggiorna ora
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PWAUpdatePrompt;
