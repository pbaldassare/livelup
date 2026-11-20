import { describe, expect, it } from 'vitest';
import {
  athleteSignupInviteUrl,
  isAthleteInviteSignup,
  parsePtInviteRef,
  resolveSignupRole,
} from '../inviteLink';
import { PUBLIC_APP_ORIGIN } from '../publicOrigin';

const PT_ID = 'f655ebb3-4470-4ab6-a74c-763b0602b869';

describe('athlete invite signup', () => {
  it('accepts a PT user UUID as ref', () => {
    expect(parsePtInviteRef(PT_ID)).toBe(PT_ID);
    expect(parsePtInviteRef(' not-a-uuid ')).toBeNull();
    expect(parsePtInviteRef(null)).toBeNull();
  });

  it('locks role for PT copy-invite links', () => {
    const invite = new URLSearchParams({ mode: 'signup', ref: PT_ID });
    expect(isAthleteInviteSignup(invite)).toBe(true);
    expect(resolveSignupRole({ isAthleteInvite: true, selectedRole: 'pt' })).toBe('atleta');
  });

  it('does not lock public or admin PT coupon signup', () => {
    expect(isAthleteInviteSignup(new URLSearchParams({ mode: 'signup' }))).toBe(false);
    expect(
      isAthleteInviteSignup(new URLSearchParams({ ref: PT_ID, coupon: 'GROWTH' })),
    ).toBe(false);
    expect(resolveSignupRole({ isAthleteInvite: false, selectedRole: 'pt' })).toBe('pt');
    expect(resolveSignupRole({ isAthleteInvite: false, selectedRole: 'admin' })).toBe(
      'atleta',
    );
  });

  it('builds athlete signup invites on Pages, not iaconnect', () => {
    expect(athleteSignupInviteUrl(PT_ID)).toBe(
      `${PUBLIC_APP_ORIGIN}/auth?mode=signup&ref=${PT_ID}`,
    );
    expect(athleteSignupInviteUrl(PT_ID)).not.toContain('iaconnect');
  });
});
