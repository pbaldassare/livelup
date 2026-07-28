/**
 * Unico punto di registrazione del service worker.
 *
 * Il SW viene registrato SOLO in produzione e su host reali
 * (dominio pubblicato o dominio custom). In dev, dentro un iframe,
 * sugli host di preview Lovable o con `?sw=off` la registrazione
 * viene rifiutata e le eventuali registrazioni residue rimosse.
 */

const SW_URL = '/sw.js';

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isBlockedHost(host: string): boolean {
  return (
    host.startsWith('id-preview--') ||
    host.startsWith('preview--') ||
    host === 'lovableproject.com' ||
    host.endsWith('.lovableproject.com') ||
    host === 'lovableproject-dev.com' ||
    host.endsWith('.lovableproject-dev.com') ||
    host === 'beta.lovable.dev' ||
    host.endsWith('.beta.lovable.dev')
  );
}

export function shouldRegisterServiceWorker(): boolean {
  if (!import.meta.env.PROD) return false;
  if (isInIframe()) return false;
  if (isBlockedHost(window.location.hostname)) return false;
  if (new URLSearchParams(window.location.search).get('sw') === 'off') return false;

  return true;
}

async function unregisterAppServiceWorkers(): Promise<void> {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const scriptURL =
            r.active?.scriptURL || r.waiting?.scriptURL || r.installing?.scriptURL || '';
          return scriptURL.endsWith(SW_URL);
        })
        .map((r) => r.unregister())
    );
  } catch {
    /* noop */
  }
}

export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  if (!shouldRegisterServiceWorker()) {
    await unregisterAppServiceWorkers();
    return;
  }

  try {
    await navigator.serviceWorker.register(SW_URL, { scope: '/' });
  } catch (err) {
    console.error('[LIVEL APP] SW registration failed:', err);
  }
}
