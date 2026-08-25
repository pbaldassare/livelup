import { safeGet, safeSet, safeRemove } from '@/lib/safeStorage';
import { isGroupInvitePath } from '@/lib/groupInvite';
import { isAuthColdStartEntry } from '@/lib/passwordRecovery';
import { getHomeRoute, type AppRole } from '@/types/roles';

/**
 * Persist the last mobile-app path so a PWA cold start at `/`
 * (start_url, iOS resume after camera/file picker, SW takeover)
 * can restore the screen the user was on instead of forcing home.
 */

const KEY_PREFIX = 'livellapp:last-app-path:';

/** Role-agnostic path saved just before PWA SKIP_WAITING / document replace. */
export const POST_UPDATE_PATH_KEY = 'livellapp:post-update-path';

function storageKey(role: AppRole): string {
  return `${KEY_PREFIX}${role}`;
}

/** Strip query/hash so prefix checks are not broken by `?` / `#`. */
export function pathnameOnly(path: string): string {
  return path.split(/[?#]/)[0] || '';
}

/** Paths that are valid restore targets for each role. */
export function isRestorableAppPath(path: string, role: AppRole): boolean {
  if (!path.startsWith('/')) return false;
  const pathname = pathnameOnly(path);
  if (!pathname.startsWith('/')) return false;
  // Reject auth/public entry points
  if (pathname === '/' || pathname.startsWith('/auth') || pathname.startsWith('/install')) {
    return false;
  }

  if (role === 'pt') {
    return pathname.startsWith('/pt/app');
  }
  if (role === 'atleta') {
    return pathname.startsWith('/app');
  }
  return false;
}

/** Safe targets for post-SW-update restore (role-agnostic). */
export function isSafePostUpdatePath(path: string): boolean {
  if (!path.startsWith('/')) return false;
  const pathname = pathnameOnly(path);
  return pathname.startsWith('/app') || pathname.startsWith('/pt');
}

export function savePostUpdatePath(fullPath: string): void {
  if (!fullPath.startsWith('/')) return;
  try {
    sessionStorage.setItem(POST_UPDATE_PATH_KEY, fullPath);
  } catch {
    // sessionStorage may be blocked in some PWA contexts
  }
}

/** Read and clear the post-update path once (boot restore). */
export function consumePostUpdatePath(): string | null {
  try {
    const stored = sessionStorage.getItem(POST_UPDATE_PATH_KEY);
    if (stored) sessionStorage.removeItem(POST_UPDATE_PATH_KEY);
    if (!stored || !isSafePostUpdatePath(stored)) return null;
    return stored;
  } catch {
    return null;
  }
}

export function peekPostUpdatePath(): string | null {
  try {
    return sessionStorage.getItem(POST_UPDATE_PATH_KEY);
  } catch {
    return null;
  }
}

/**
 * Sync redirect before React mounts (call from main.tsx).
 * If the PWA cold-started at `/` or `/auth` but we have a saved post-update
 * (or last) path, jump there immediately to avoid home flash / blank hang.
 */
export function redirectIfColdStartNeedsRestore(): boolean {
  if (typeof window === 'undefined') return false;
  const { pathname, search, hash } = window.location;
  const current = `${pathname}${search}${hash}`;
  if (!isAuthColdStartEntry(pathname, search, hash)) return false;

  let target: string | null = null;
  try {
    target = sessionStorage.getItem(POST_UPDATE_PATH_KEY);
  } catch {
    target = null;
  }
  if (!target || !isSafePostUpdatePath(target)) return false;
  if (target === current) return false;

  try {
    sessionStorage.removeItem(POST_UPDATE_PATH_KEY);
  } catch {
    /* noop */
  }
  window.location.replace(target);
  return true;
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

/** PWA standalone or narrow viewport — same gate as Index cold-start restore. */
export function shouldRestoreLastAppPath(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('view') === 'web') return false;
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  const isNarrow = window.matchMedia('(max-width: 767px)').matches;
  return isStandalone || isNarrow;
}

export type AuthRedirectFrom =
  | string
  | { pathname: string; search?: string }
  | null
  | undefined;

function normalizeFromPath(from: AuthRedirectFrom): string | null {
  if (!from) return null;
  if (typeof from === 'string') return from.startsWith('/') ? from : null;
  if (typeof from.pathname === 'string' && from.pathname.startsWith('/')) {
    return `${from.pathname}${from.search || ''}`;
  }
  return null;
}

/**
 * Post-auth / already-authenticated redirect priority:
 * 1. `state.from` if restorable for role
 * 2. last remembered app path on PWA/mobile
 * 3. role home
 */
export function resolvePostAuthRedirect(
  role: AppRole,
  from?: AuthRedirectFrom,
  options?: { preferLastPath?: boolean },
): string {
  const fromPath = normalizeFromPath(from);
  // Deep link pubblico gruppo: dopo login si torna a /g/:token
  if (fromPath && isGroupInvitePath(fromPath)) {
    return pathnameOnly(fromPath);
  }
  if (fromPath && isRestorableAppPath(fromPath, role)) {
    return fromPath;
  }

  const preferLast = options?.preferLastPath ?? shouldRestoreLastAppPath();
  if (preferLast) {
    const last = getLastAppPath(role);
    if (last) return last;
  }

  return getHomeRoute(role);
}
