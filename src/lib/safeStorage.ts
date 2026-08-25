/**
 * Safe localStorage wrappers that never throw.
 * Prevents white-screen crashes on mobile/PWA when storage is
 * blocked, full, or corrupted.
 */

export function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    console.warn('[safeStorage] getItem failed for', key);
    return null;
  }
}

export function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    console.warn('[safeStorage] setItem failed for', key);
  }
}

export function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    console.warn('[safeStorage] removeItem failed for', key);
  }
}

export function safeSessionGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSessionSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function safeSessionRemove(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** localStorage, then sessionStorage (PWA / iOS a volte blocca solo uno dei due). */
export function safeGetAny(key: string): string | null {
  return safeGet(key) ?? safeSessionGet(key);
}

export function safeSetBoth(key: string, value: string): void {
  safeSet(key, value);
  safeSessionSet(key, value);
}

export function safeRemoveBoth(key: string): void {
  safeRemove(key);
  safeSessionRemove(key);
}
