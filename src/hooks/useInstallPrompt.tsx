import { useState, useEffect, useCallback } from 'react';
import { safeGet, safeSet } from '@/lib/safeStorage';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (navigator as any).standalone === true;
      setIsInstalled(isStandalone || isIOSStandalone);
    };

    // Check if iOS (iPadOS 13+ si presenta come "Macintosh" con touch)
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIPadOS =
        /macintosh/.test(userAgent) && typeof document !== 'undefined' && 'ontouchend' in document;
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) || isIPadOS;
      setIsIOS(isIOSDevice);
    };

    checkInstalled();
    checkIOS();

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Listen for successful install
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstallable(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error installing PWA:', error);
      return false;
    }
  }, [deferredPrompt]);

  const dismissBanner = useCallback(() => {
    safeSet('pwa-banner-dismissed', Date.now().toString());
  }, []);

  const isBannerDismissed = useCallback(() => {
    const dismissed = safeGet('pwa-banner-dismissed');
    if (!dismissed) return false;
    
    // Show again after 7 days
    const dismissedAt = parseInt(dismissed, 10);
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - dismissedAt < sevenDays;
  }, []);

  return {
    isInstallable,
    isInstalled,
    isIOS,
    install,
    dismissBanner,
    isBannerDismissed,
    canShowPrompt: (isInstallable || isIOS) && !isInstalled && !isBannerDismissed(),
  };
}
