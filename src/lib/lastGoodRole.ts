import { safeGet, safeRemove, safeSet } from '@/lib/safeStorage';
import type { AppRole } from '@/types/roles';

/** Survives full page reload so ProtectedRoute does not treat a slow role RPC as logout. */
export const LAST_GOOD_ROLE_KEY = 'livellapp:last-good-role';

const VALID_ROLES: AppRole[] = ['admin', 'pt', 'atleta'];

export function isValidRole(value: unknown): value is AppRole {
  return typeof value === 'string' && VALID_ROLES.includes(value as AppRole);
}

/** Prefer a freshly resolved role; fall back to the last known good one on transient failure. */
export function mergeResolvedRole(
  resolved: AppRole | null,
  lastGood: AppRole | null,
): AppRole | null {
  return resolved ?? lastGood;
}

export function readLastGoodRole(userId: string): AppRole | null {
  if (!userId) return null;
  const raw = safeGet(LAST_GOOD_ROLE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { userId?: unknown; role?: unknown };
    if (parsed.userId !== userId) return null;
    return isValidRole(parsed.role) ? parsed.role : null;
  } catch {
    return null;
  }
}

export function writeLastGoodRole(userId: string, role: AppRole): void {
  if (!userId || !isValidRole(role)) return;
  safeSet(LAST_GOOD_ROLE_KEY, JSON.stringify({ userId, role }));
}

export function clearLastGoodRole(): void {
  safeRemove(LAST_GOOD_ROLE_KEY);
}
