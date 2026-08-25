import { describe, it, expect, beforeEach } from 'vitest';
import {
  isRestorableAppPath,
  isSafePostUpdatePath,
  rememberAppPath,
  getLastAppPath,
  resolvePostAuthRedirect,
  savePostUpdatePath,
  consumePostUpdatePath,
  pathnameOnly,
} from '../lastAppPath';

describe('lastAppPath', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('accepts PT and atleta app paths', () => {
    expect(isRestorableAppPath('/pt/app/settings', 'pt')).toBe(true);
    expect(isRestorableAppPath('/pt/app/exercises?tab=1', 'pt')).toBe(true);
    expect(isRestorableAppPath('/pt/app/exercises?tab=1#top', 'pt')).toBe(true);
    expect(isRestorableAppPath('/app/profile', 'atleta')).toBe(true);
    expect(isRestorableAppPath('/app/workout/1?from=home', 'atleta')).toBe(true);
  });

  it('validates restorable paths using pathname only', () => {
    expect(pathnameOnly('/pt/app/x?q=1#h')).toBe('/pt/app/x');
    // Query must not break prefix checks (e.g. "?/auth" nonsense)
    expect(isRestorableAppPath('/pt/app/settings?next=/auth', 'pt')).toBe(true);
    expect(isRestorableAppPath('/app/chat?id=1', 'atleta')).toBe(true);
    expect(isRestorableAppPath('/auth?from=/app', 'atleta')).toBe(false);
  });

  it('rejects public and wrong-role paths', () => {
    expect(isRestorableAppPath('/', 'pt')).toBe(false);
    expect(isRestorableAppPath('/auth', 'pt')).toBe(false);
    expect(isRestorableAppPath('/pt/settings', 'pt')).toBe(false);
    expect(isRestorableAppPath('/pt/app/settings', 'atleta')).toBe(false);
    expect(isRestorableAppPath('/app/profile', 'pt')).toBe(false);
  });

  it('remembers and restores last path', () => {
    rememberAppPath('/pt/app/settings', '', 'pt');
    expect(getLastAppPath('pt')).toBe('/pt/app/settings');

    rememberAppPath('/pt/app/exercises', '?q=1', 'pt');
    expect(getLastAppPath('pt')).toBe('/pt/app/exercises?q=1');
  });

  it('ignores null role and invalid paths', () => {
    rememberAppPath('/pt/app/settings', '', null);
    expect(getLastAppPath('pt')).toBe(null);

    rememberAppPath('/pt/settings', '', 'pt');
    expect(getLastAppPath('pt')).toBe(null);
  });

  describe('post-update path', () => {
    it('accepts /app and /pt prefixes with query/hash', () => {
      expect(isSafePostUpdatePath('/app/workout?x=1')).toBe(true);
      expect(isSafePostUpdatePath('/pt/app/settings#sec')).toBe(true);
      expect(isSafePostUpdatePath('/pt/athletes')).toBe(true);
      expect(isSafePostUpdatePath('/auth')).toBe(false);
      expect(isSafePostUpdatePath('/')).toBe(false);
    });

    it('saves and consumes once', () => {
      savePostUpdatePath('/app/profile?tab=1');
      expect(consumePostUpdatePath()).toBe('/app/profile?tab=1');
      expect(consumePostUpdatePath()).toBe(null);
    });

    it('does not treat password recovery URLs as PWA cold-start entry', async () => {
      const { isAuthColdStartEntry } = await import('../passwordRecovery');
      expect(isAuthColdStartEntry('/auth', '?type=recovery', '')).toBe(false);
      expect(isAuthColdStartEntry('/auth/reset-password', '', '')).toBe(false);
      expect(isAuthColdStartEntry('/auth', '', '#type=recovery')).toBe(false);
      expect(isAuthColdStartEntry('/auth', '', '')).toBe(true);
      expect(isAuthColdStartEntry('/', '', '')).toBe(true);
    });
  });

  describe('resolvePostAuthRedirect', () => {
    it('prefers safe state.from over last path and home', () => {
      rememberAppPath('/app/profile', '', 'atleta');
      expect(
        resolvePostAuthRedirect(
          'atleta',
          { pathname: '/app/workout/123', search: '?x=1' },
          { preferLastPath: true },
        ),
      ).toBe('/app/workout/123?x=1');
    });

    it('ignores unsafe from and uses last path when preferLastPath', () => {
      rememberAppPath('/pt/app/settings', '', 'pt');
      expect(
        resolvePostAuthRedirect('pt', { pathname: '/auth' }, { preferLastPath: true }),
      ).toBe('/pt/app/settings');
      expect(
        resolvePostAuthRedirect('pt', { pathname: '/pt/athletes' }, { preferLastPath: true }),
      ).toBe('/pt/app/settings');
    });

    it('falls back to home when no from and no last path', () => {
      expect(resolvePostAuthRedirect('atleta', null, { preferLastPath: true })).toBe('/app');
      expect(resolvePostAuthRedirect('pt', undefined, { preferLastPath: false })).toBe('/pt');
    });

    it('skips last path when preferLastPath is false', () => {
      rememberAppPath('/app/profile', '', 'atleta');
      expect(resolvePostAuthRedirect('atleta', null, { preferLastPath: false })).toBe('/app');
    });

    it('restores full path with query via last path', () => {
      rememberAppPath('/app/chat', '?id=abc', 'atleta');
      expect(resolvePostAuthRedirect('atleta', null, { preferLastPath: true })).toBe(
        '/app/chat?id=abc',
      );
    });

    it('restores group invite deep links after login', () => {
      const invite = '/g/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      expect(resolvePostAuthRedirect('atleta', { pathname: invite })).toBe(invite);
      expect(resolvePostAuthRedirect('pt', invite, { preferLastPath: false })).toBe(invite);
    });
  });
});
