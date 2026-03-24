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
