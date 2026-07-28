import { safeGet, safeSet, safeRemove } from '@/lib/safeStorage';
import type { AppRole } from '@/types/roles';

/**
 * Persist the last mobile-app path so a PWA cold start at `/`
 * (start_url, iOS resume after camera/file picker, SW takeover)
 * can restore the screen the user was on instead of forcing home.
 */

const KEY_PREFIX = 'livellapp:last-app-path:';

function storageKey(role: AppRole): string {
  return `${KEY_PREFIX}${role}`;
}

/** Paths that are valid restore targets for each role. */
export function isRestorableAppPath(path: string, role: AppRole): boolean {
  if (!path.startsWith('/')) return false;
  // Reject auth/public entry points
  if (path === '/' || path.startsWith('/auth') || path.startsWith('/install')) return false;

  if (role === 'pt') {
    return path.startsWith('/pt/app');
  }
  if (role === 'atleta') {
    return path.startsWith('/app');
  }
  return false;
}

export function rememberAppPath(pathname: string, search: string, role: AppRole | null): void {
  if (!role) return;
  const full = `${pathname}${search || ''}`;
  if (!isRestorableAppPath(full, role)) return;
  safeSet(storageKey(role), full);
}

export function getLastAppPath(role: AppRole): string | null {
  const stored = safeGet(storageKey(role));
  if (!stored || !isRestorableAppPath(stored, role)) {
    if (stored) safeRemove(storageKey(role));
    return null;
  }
  return stored;
}
