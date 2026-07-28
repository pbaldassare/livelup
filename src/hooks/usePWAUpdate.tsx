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
    const waiting = state.registration?.waiting;
    if (!waiting) return;
    waiting.postMessage({ type: 'SKIP_WAITING' });
  }, [state.registration]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let reloading = false;
    const handleControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };

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
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    let intervalId: ReturnType<typeof setInterval> | undefined;

    const markUpdateAvailable = (registration: ServiceWorkerRegistration) => {
      setState(prev => ({ ...prev, isUpdateAvailable: true, registration }));
    };

    const init = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;

        setState(prev => ({ ...prev, registration }));

        // Un SW già in attesa = aggiornamento pronto
        if (registration.waiting && navigator.serviceWorker.controller) {
          markUpdateAvailable(registration);
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              markUpdateAvailable(registration);
            }
          });
        });

        // Controllo periodico degli aggiornamenti
        intervalId = setInterval(() => {
          registration.update().catch(() => {});
        }, 60 * 60 * 1000);
      } catch (error) {
        console.error('Error checking for SW updates:', error);
      }
    };

    init();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      if (intervalId) clearInterval(intervalId);
    };
  }, [toast]);


  return {
    ...state,
    updateServiceWorker,
  };
}

export default usePWAUpdate;
