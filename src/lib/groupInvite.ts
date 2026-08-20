import type { AppRole } from '@/types/roles';

/** Deep link pubblico di invito gruppo: /g/{invite_token} */
export const GROUP_INVITE_PATH_PREFIX = '/g';

export const PENDING_GROUP_INVITE_KEY = 'livellapp:pending-group-invite';

export const GROUP_INVITE_TOKEN_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pathOnly(path: string): string {
  return path.split(/[?#]/)[0] || '';
}

export function isGroupInviteToken(value: string | null | undefined): value is string {
  return !!value && GROUP_INVITE_TOKEN_RE.test(value);
}

export function isGroupInvitePath(path: string | null | undefined): boolean {
  if (!path) return false;
  const pathname = pathOnly(path);
  const match = pathname.match(/^\/g\/([^/]+)$/i);
  return !!match && isGroupInviteToken(match[1]);
}

export function parseGroupInviteTokenFromPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const pathname = pathOnly(path);
  const match = pathname.match(/^\/g\/([^/]+)$/i);
  const token = match?.[1];
  return isGroupInviteToken(token) ? token : null;
}

export function getGroupInvitePath(inviteToken: string): string {
  return `${GROUP_INVITE_PATH_PREFIX}/${inviteToken}`;
}

export function getGroupInviteUrl(inviteToken: string): string {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://livelapp.iaconnect.it';
  return `${origin}${getGroupInvitePath(inviteToken)}`;
}

/** Destinazione in-app per iscriversi, in base al ruolo. */
export function groupInviteAppJoinPath(role: AppRole, token: string): string | null {
  if (role === 'atleta') return `/app/groups/join/${token}`;
  if (role === 'pt') return `/pt/app/groups/join/${token}`;
  return null;
}

export function savePendingGroupInvite(token: string): void {
  if (!isGroupInviteToken(token)) return;
  try {
    localStorage.setItem(PENDING_GROUP_INVITE_KEY, token);
  } catch {
    /* private mode */
  }
}

export function peekPendingGroupInvite(): string | null {
  try {
    const stored = localStorage.getItem(PENDING_GROUP_INVITE_KEY);
    return isGroupInviteToken(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function consumePendingGroupInvite(): string | null {
  const token = peekPendingGroupInvite();
  try {
    localStorage.removeItem(PENDING_GROUP_INVITE_KEY);
  } catch {
    /* noop */
  }
  return token;
}
