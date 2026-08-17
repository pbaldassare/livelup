import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ServiceWorkerState {
  isUpdateAvailable: boolean;
  isOffline: boolean;
  registration: ServiceWorkerRegistration | null;
}

/**
 * PWA update UX:
 * Activate the waiting SW with SKIP_WAITING, but do NOT force a document
 * reload/replace. Reloading after SW claim was causing blank screens and
 * home redirects. The user stays on the current route; new assets apply on
 * the next natural navigation / cold start (last-path restore handles `/`).
 */
export function usePWAUpdate() {
  const { toast } = useToast();
  const [state, setState] = useState<ServiceWorkerState>({
    isUpdateAvailable: false,
    isOffline: !navigator.onLine,
    registration: null,
  });

  const dismissUpdate = useCallback(() => {
    setState((prev) => ({ ...prev, isUpdateAvailable: false }));
  }, []);

  const updateServiceWorker = useCallback(async () => {
    const registration = state.registration;

    if (!registration) {
      dismissUpdate();
      toast({
        title: 'App aggiornata',
        description: 'Resti sulla pagina corrente.',
      });
      return;
    }

    let waiting = registration.waiting;
    if (!waiting) {
      try {
        await registration.update();
        waiting = registration.waiting;
      } catch {
        // ignore
      }
    }

    if (waiting) {
      waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    dismissUpdate();
    toast({
      title: 'App aggiornata',
      description: 'Puoi continuare da questa pagina. Le novità saranno attive subito.',
    });
  }, [state.registration, dismissUpdate, toast]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Intentionally NO controllerchange → reload. That path caused blank UI.

    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOffline: false }));
      toast({
        title: 'Connessione ripristinata',
        description: 'Sei di nuovo online!',
      });
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOffline: true }));
      toast({
        title: 'Sei offline',
        description: 'Alcune funzionalità potrebbero non essere disponibili.',
        variant: 'destructive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    let intervalId: ReturnType<typeof setInterval> | undefined;

    const markUpdateAvailable = (registration: ServiceWorkerRegistration) => {
      setState((prev) => ({ ...prev, isUpdateAvailable: true, registration }));
    };

    const init = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        setState((prev) => ({ ...prev, registration }));

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

        intervalId = setInterval(() => {
          registration.update().catch(() => {});
        }, 60 * 60 * 1000);
      } catch (error) {
        console.error('Error checking for SW updates:', error);
      }
    };

    void init();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (intervalId) clearInterval(intervalId);
    };
  }, [toast]);

  return {
    ...state,
    updateServiceWorker,
  };
}

export default usePWAUpdate;
