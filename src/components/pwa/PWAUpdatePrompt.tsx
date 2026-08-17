import { RefreshCw, Download } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';
import { useAuth } from '@/hooks/useAuth';
import { rememberAppPath, savePostUpdatePath } from '@/lib/lastAppPath';
import { cn } from '@/lib/utils';

export function PWAUpdatePrompt() {
  const { isUpdateAvailable, updateServiceWorker } = usePWAUpdate();
  const location = useLocation();
  const { role } = useAuth();

  if (!isUpdateAvailable) return null;

  const handleUpdate = () => {
    const full = `${location.pathname}${location.search}${location.hash}`;
    // Persist for cold start at `/` (manifest start_url) after future app opens
    savePostUpdatePath(full);
    rememberAppPath(location.pathname, location.search, role);
    void updateServiceWorker();
  };

  return (
    <div
      className={cn(
        'fixed top-4 left-4 right-4 z-[100] md:left-auto md:right-6 md:max-w-sm',
        'animate-fade-in',
      )}
    >
      <div className="glass rounded-2xl p-4 shadow-lg border border-primary/30 bg-background/95">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Download className="w-5 h-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">Aggiornamento disponibile</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Una nuova versione è pronta. Resta su questa pagina.
            </p>

            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                className="btn-gradient text-white gap-1.5"
                onClick={handleUpdate}
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
