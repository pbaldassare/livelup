import { describe, it, expect, beforeEach } from 'vitest';
import {
  LAST_GOOD_ROLE_KEY,
  clearLastGoodRole,
  isValidRole,
  mergeResolvedRole,
  readLastGoodRole,
  writeLastGoodRole,
} from '../lastGoodRole';

describe('lastGoodRole', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('accepts only app roles', () => {
    expect(isValidRole('atleta')).toBe(true);
    expect(isValidRole('pt')).toBe(true);
    expect(isValidRole('admin')).toBe(true);
    expect(isValidRole('guest')).toBe(false);
    expect(isValidRole(null)).toBe(false);
  });

  it('keeps the last good role when RPC returns null', () => {
    expect(mergeResolvedRole(null, 'pt')).toBe('pt');
    expect(mergeResolvedRole('atleta', 'pt')).toBe('atleta');
    expect(mergeResolvedRole(null, null)).toBe(null);
  });

  it('persists and restores a role for the same user', () => {
    writeLastGoodRole('user-1', 'atleta');
    expect(readLastGoodRole('user-1')).toBe('atleta');
    expect(localStorage.getItem(LAST_GOOD_ROLE_KEY)).toContain('atleta');
  });

  it('does not apply another user\'s cached role', () => {
    writeLastGoodRole('user-1', 'admin');
    expect(readLastGoodRole('user-2')).toBe(null);
  });

  it('clears on explicit logout', () => {
    writeLastGoodRole('user-1', 'pt');
    clearLastGoodRole();
    expect(readLastGoodRole('user-1')).toBe(null);
  });
});
