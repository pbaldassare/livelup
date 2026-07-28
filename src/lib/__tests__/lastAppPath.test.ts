import { describe, it, expect, beforeEach } from 'vitest';
import {
  isRestorableAppPath,
  rememberAppPath,
  getLastAppPath,
} from '../lastAppPath';

describe('lastAppPath', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('accepts PT and atleta app paths', () => {
    expect(isRestorableAppPath('/pt/app/settings', 'pt')).toBe(true);
    expect(isRestorableAppPath('/pt/app/exercises?tab=1', 'pt')).toBe(true);
    expect(isRestorableAppPath('/app/profile', 'atleta')).toBe(true);
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
});
