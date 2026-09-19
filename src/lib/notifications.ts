import { mapPTWebToApp } from '@/hooks/usePTSurface';

// =====================================================
// Notification deep-link helpers (shared PT web / PT PWA / atleta)
// =====================================================

export type NotificationAudience = 'pt' | 'atleta' | 'admin' | string | null | undefined;

export interface NotificationLinkInput {
  type: string;
  action_url?: string | null;
  data?: unknown;
}

export function isPtAppPath(pathname: string): boolean {
  return pathname.startsWith('/pt/app');
}

export function extractChatId(n: NotificationLinkInput): string | null {
  const fromData =
    n.data && typeof n.data === 'object'
      ? (n.data as Record<string, unknown>).chat_id
      : null;
  if (typeof fromData === 'string' && fromData) return fromData;
  if (n.action_url) {
    const m = n.action_url.match(/\/(?:chat|messages)\/([0-9a-fA-F-]{8,})/);
    if (m) return m[1];
  }
  return null;
}

export function isMessageNotification(n: Pick<NotificationLinkInput, 'type' | 'action_url'>): boolean {
  return (
    n.type === 'message' ||
    (n.action_url || '').includes('/messages/') ||
    (n.action_url || '').includes('/chat/')
  );
}

export function connectionInboxPath(opts: {
  role: NotificationAudience;
  pathname: string;
}): string {
  if (opts.role === 'pt') {
    return isPtAppPath(opts.pathname)
      ? '/pt/app/athletes?tab=pending'
      : '/pt/athletes?tab=pending';
  }
  if (opts.role === 'atleta') return '/app';
  return '/';
}

export function notificationsInboxPath(opts: {
  role: NotificationAudience;
  pathname: string;
}): string {
  if (opts.role === 'pt') {
    return isPtAppPath(opts.pathname) ? '/pt/app/notifications' : '/pt';
  }
  if (opts.role === 'atleta') return '/app/notifications';
  return '/';
}

function splitUrl(url: string): { pathname: string; search: string } {
  const q = url.indexOf('?');
  if (q === -1) return { pathname: url, search: '' };
  return { pathname: url.slice(0, q), search: url.slice(q) };
}

function withSearch(pathname: string, search: string): string {
  if (!search) return pathname;
  if (pathname.includes('?')) return pathname;
  return `${pathname}${search.startsWith('?') ? search : `?${search}`}`;
}

/**
 * Maps a stored action_url to a route that stays on the current surface.
 * Legacy trigger URLs (`/messages/:id`, `/connections`) are remapped per role.
 */
export function remapNotificationActionUrl(
  actionUrl: string | null | undefined,
  opts: { role: NotificationAudience; pathname: string },
): string | null {
  if (!actionUrl) return notificationsInboxPath(opts);

  if (actionUrl === '/connections' || actionUrl.startsWith('/connections')) {
    return connectionInboxPath(opts);
  }

  if (actionUrl.startsWith('/messages/')) {
    if (opts.role === 'pt') {
      return isPtAppPath(opts.pathname) ? '/pt/app/chat' : '/pt/messages';
    }
    if (opts.role === 'atleta') return '/app/chat';
    return actionUrl;
  }

  const { pathname, search } = splitUrl(actionUrl);

  if (opts.role === 'pt' && isPtAppPath(opts.pathname)) {
    if (pathname.startsWith('/pt/app')) return actionUrl;
    if (pathname.startsWith('/pt/')) {
      return withSearch(mapPTWebToApp(pathname), search);
    }
    if (pathname.startsWith('/app/')) {
      return '/pt/app';
    }
  }

  if (opts.role === 'pt' && pathname.startsWith('/app/')) {
    return '/pt';
  }

  return actionUrl;
}
