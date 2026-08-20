import { describe, it, expect, beforeEach } from 'vitest';
import {
  consumePendingGroupInvite,
  getGroupInvitePath,
  groupInviteAppJoinPath,
  isGroupInvitePath,
  isGroupInviteToken,
  parseGroupInviteTokenFromPath,
  peekPendingGroupInvite,
  savePendingGroupInvite,
} from '../groupInvite';

const TOKEN = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

describe('groupInvite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('validates invite tokens and paths', () => {
    expect(isGroupInviteToken(TOKEN)).toBe(true);
    expect(isGroupInviteToken('not-a-uuid')).toBe(false);
    expect(isGroupInvitePath(`/g/${TOKEN}`)).toBe(true);
    expect(isGroupInvitePath(`/g/${TOKEN}?x=1`)).toBe(true);
    expect(isGroupInvitePath(`/app/groups/join/${TOKEN}`)).toBe(false);
    expect(parseGroupInviteTokenFromPath(`/g/${TOKEN}`)).toBe(TOKEN);
  });

  it('builds join paths per role', () => {
    expect(getGroupInvitePath(TOKEN)).toBe(`/g/${TOKEN}`);
    expect(groupInviteAppJoinPath('atleta', TOKEN)).toBe(`/app/groups/join/${TOKEN}`);
    expect(groupInviteAppJoinPath('pt', TOKEN)).toBe(`/pt/app/groups/join/${TOKEN}`);
    expect(groupInviteAppJoinPath('admin', TOKEN)).toBe(null);
  });

  it('persists pending invite', () => {
    savePendingGroupInvite(TOKEN);
    expect(peekPendingGroupInvite()).toBe(TOKEN);
    expect(consumePendingGroupInvite()).toBe(TOKEN);
    expect(peekPendingGroupInvite()).toBe(null);
  });
});
