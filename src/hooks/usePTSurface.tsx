import { useEffect, useState } from 'react';

/**
 * usePTSurface
 * ------------
 * Decides which PT surface (web dashboard vs mobile PWA app) the user should land on.
 *
 * Returns `'app'` when:
 *  - viewport is narrow (< 768px), OR
 *  - the page is running as an installed PWA (display-mode: standalone), OR
 *  - the iOS standalone flag is set,
 * unless the URL carries `?view=web` (manual override, e.g. for support).
 *
 * Returns `'web'` otherwise.
 *
 * The hook listens to media-query changes so resizing the browser flips the surface
 * without a reload.
 */
export type PTSurface = 'web' | 'app';

function computeSurface(): PTSurface {
  if (typeof window === 'undefined') return 'web';

  // Manual override via ?view=web — useful when a PT needs the desktop UX from a phone
  const params = new URLSearchParams(window.location.search);
  if (params.get('view') === 'web') return 'web';
  if (params.get('view') === 'app') return 'app';

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (navigator as unknown as { standalone?: boolean }).standalone === true;

  const isNarrow = window.matchMedia('(max-width: 767px)').matches;

  return isStandalone || isNarrow ? 'app' : 'web';
}

export function usePTSurface(): PTSurface {
  const [surface, setSurface] = useState<PTSurface>(() => computeSurface());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mqNarrow = window.matchMedia('(max-width: 767px)');
    const mqStandalone = window.matchMedia('(display-mode: standalone)');

    const update = () => setSurface(computeSurface());

    mqNarrow.addEventListener('change', update);
    mqStandalone.addEventListener('change', update);

    return () => {
      mqNarrow.removeEventListener('change', update);
      mqStandalone.removeEventListener('change', update);
    };
  }, []);

  return surface;
}

/**
 * Maps a web PT route to its closest mobile PWA equivalent.
 * Unknown paths fall back to `/pt/app`.
 */
export function mapPTWebToApp(pathname: string): string {
  // Exact mapping for known routes
  if (pathname === '/pt' || pathname === '/pt/') return '/pt/app';
  // Athlete detail: i link interni usano la forma singolare /pt/app/athlete/:id
  if (pathname.startsWith('/pt/athletes/')) {
    const rest = pathname.replace('/pt/athletes/', '');
    return `/pt/app/athlete/${rest}`;
  }
  if (pathname.startsWith('/pt/athletes')) return '/pt/app/athletes';
  if (pathname.startsWith('/pt/workouts')) return '/pt/app/workouts';
  if (pathname.startsWith('/pt/templates/')) {
    const rest = pathname.replace('/pt/templates/', '');
    return `/pt/app/templates/${rest}`;
  }
  if (pathname.startsWith('/pt/calendar')) return '/pt/app/calendar';
  if (pathname.startsWith('/pt/groups')) return pathname.replace('/pt/groups', '/pt/app/groups');
  if (pathname.startsWith('/pt/events')) return '/pt/app/calendar';
  if (pathname.startsWith('/pt/messages')) return '/pt/app/chat';
  if (pathname.startsWith('/pt/exercises')) return '/pt/app/exercises';
  if (pathname.startsWith('/pt/templates')) return '/pt/app/templates';
  if (pathname.startsWith('/pt/coupons')) return '/pt/app/coupons';
  if (pathname.startsWith('/pt/payments')) return '/pt/app/payments';
  if (pathname.startsWith('/pt/blog')) return '/pt/app/blog';
  if (pathname.startsWith('/pt/settings')) return '/pt/app/settings';
  // Onboarding is shared — keep as is
  if (pathname.startsWith('/pt/onboarding')) return pathname;
  return '/pt/app';
}

