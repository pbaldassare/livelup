import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { savePostUpdatePath } from '@/lib/lastAppPath';

interface ServiceWorkerState {
  isUpdateAvailable: boolean;
  isOffline: boolean;
  registration: ServiceWorkerRegistration | null;
}

/**
 * PWA update UX: completamente AUTOMATICO.
 *
 * Appena un nuovo service worker è installato:
 * 1. salviamo il path corrente (ripristinato dopo il reload),
 * 2. attiviamo il SW con SKIP_WAITING,
 * 3. al `controllerchange` ricarichiamo la pagina una sola volta.
 *
 * L'utente non deve premere nulla. Il controllo aggiornamenti gira
 * all'avvio, ogni 15 minuti e al ritorno in foreground/online.
 */
export function usePWAUpdate() {
  const { toast } = useToast();
  const [state, setState] = useState<ServiceWorkerState>({
    isUpdateAvailable: false,
    isOffline: !navigator.onLine,
    registration: null,
  });
  const applyingRef = useRef(false);
  const reloadedRef = useRef(false);

  const dismissUpdate = useCallback(() => {
    setState((prev) => ({ ...prev, isUpdateAvailable: false }));
  }, []);

  const applyUpdate = useCallback((registration: ServiceWorkerRegistration) => {
    if (applyingRef.current) return;
    const waiting = registration.waiting;
    if (!waiting) return;
    applyingRef.current = true;

    try {
      const { pathname, search, hash } = window.location;
      savePostUpdatePath(`${pathname}${search}${hash}`);
    } catch {
      /* noop */
    }

    waiting.postMessage({ type: 'SKIP_WAITING' });
  }, []);

  // Manual trigger (retro-compatibile con PWAUpdatePrompt)
  const updateServiceWorker = useCallback(async () => {
    const registration = state.registration;
    if (!registration) {
      dismissUpdate();
      return;
    }
    if (!registration.waiting) {
      try {
        await registration.update();
      } catch {
        /* noop */
      }
    }
    applyUpdate(registration);
    dismissUpdate();
  }, [state.registration, dismissUpdate, applyUpdate]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleControllerChange = () => {
      if (reloadedRef.current) return;
      reloadedRef.current = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

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
    let cleanupExtra: (() => void) | undefined;

    const init = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        setState((prev) => ({ ...prev, registration }));

        // SW già in attesa al primo load → attiva subito
        if (registration.waiting && navigator.serviceWorker.controller) {
          applyUpdate(registration);
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              applyUpdate(registration);
            }
          });
        });

        const checkForUpdate = () => {
          registration.update().catch(() => {});
        };

        checkForUpdate();
        intervalId = setInterval(checkForUpdate, 15 * 60 * 1000);

        const onVisible = () => {
          if (document.visibilityState === 'visible') checkForUpdate();
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', checkForUpdate);
        window.addEventListener('online', checkForUpdate);
        cleanupExtra = () => {
          document.removeEventListener('visibilitychange', onVisible);
          window.removeEventListener('focus', checkForUpdate);
          window.removeEventListener('online', checkForUpdate);
        };
      } catch (error) {
        console.error('Error checking for SW updates:', error);
      }
    };

    void init();

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (intervalId) clearInterval(intervalId);
      cleanupExtra?.();
    };
  }, [toast, applyUpdate]);

  return {
    ...state,
    updateServiceWorker,
  };
}

export default usePWAUpdate;
