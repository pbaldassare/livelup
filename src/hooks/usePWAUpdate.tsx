import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ServiceWorkerState {
  isUpdateAvailable: boolean;
  isOffline: boolean;
  registration: ServiceWorkerRegistration | null;
}

export function usePWAUpdate() {
  const { toast } = useToast();
  const [state, setState] = useState<ServiceWorkerState>({
    isUpdateAvailable: false,
    isOffline: !navigator.onLine,
    registration: null,
  });

  const updateServiceWorker = useCallback(() => {
    if (state.registration?.waiting) {
      // Tell the waiting service worker to skip waiting
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Reload once the new service worker takes over
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }, [state.registration]);

  useEffect(() => {
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) return;

    const handleOnline = () => {
      setState(prev => ({ ...prev, isOffline: false }));
      toast({
        title: "Connessione ripristinata",
        description: "Sei di nuovo online!",
      });
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOffline: true }));
      toast({
        title: "Sei offline",
        description: "Alcune funzionalità potrebbero non essere disponibili.",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for service worker updates from vite-plugin-pwa
    const handleSWUpdate = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New update available
                setState(prev => ({ 
                  ...prev, 
                  isUpdateAvailable: true,
                  registration 
                }));
                
                toast({
                  title: "Aggiornamento disponibile",
                  description: "Una nuova versione di LIVELLAPP è pronta. Clicca per aggiornare.",
                  action: (
                    <button
                      onClick={() => {
                        if (registration.waiting) {
                          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                        }
                      }}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-8 px-3 hover:bg-primary/90"
                    >
                      Aggiorna
                    </button>
                  ),
                  duration: 10000,
                });
              }
            });
          }
        });

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check every hour

        setState(prev => ({ ...prev, registration }));
      } catch (error) {
        console.error('Error checking for SW updates:', error);
      }
    };

    handleSWUpdate();

    // Listen for controller change (when new SW takes over)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (state.isUpdateAvailable) {
        window.location.reload();
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast, state.isUpdateAvailable]);

  return {
    ...state,
    updateServiceWorker,
  };
}

export default usePWAUpdate;
