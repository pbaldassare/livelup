import { useState, useEffect } from 'react';
import { X, Download, Share, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { cn } from '@/lib/utils';

export function InstallBanner() {
  const { isInstallable, isInstalled, isIOS, install, dismissBanner, canShowPrompt } = useInstallPrompt();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    // Delay showing banner
    if (canShowPrompt) {
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [canShowPrompt]);

  const handleDismiss = () => {
    setIsAnimatingOut(true);
    dismissBanner();
    setTimeout(() => setIsVisible(false), 300);
  };

  const handleInstall = async () => {
    if (isIOS) {
      // Redirect to install page for iOS instructions
      window.location.href = '/install';
      return;
    }
    
    const success = await install();
    if (success) {
      handleDismiss();
    }
  };

  if (!isVisible || isInstalled) return null;

  return (
    <div
      className={cn(
        'fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-sm',
        'transition-all duration-300 ease-out',
        isAnimatingOut ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
      )}
    >
      <div className="glass rounded-2xl p-4 shadow-lg border border-primary/20">
        <div className="flex items-start gap-3">
          {/* App Icon */}
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <img 
              src="/livellapp-icon.svg" 
              alt="LIVELLAPP" 
              className="w-8 h-8"
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">Installa LIVELLAPP</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isIOS 
                ? 'Aggiungi alla schermata Home per un accesso rapido'
                : 'Installa l\'app per un\'esperienza migliore'
              }
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              <Button 
                size="sm" 
                className="btn-gradient text-white gap-1.5"
                onClick={handleInstall}
              >
                {isIOS ? (
                  <>
                    <Share className="w-4 h-4" />
                    Come fare
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Installa
                  </>
                )}
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={handleDismiss}
              >
                Non ora
              </Button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded-full hover:bg-muted transition-colors"
            aria-label="Chiudi"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default InstallBanner;
