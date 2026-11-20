import { describe, expect, it } from 'vitest';
import { otpTypesToTry } from '@/lib/authEmailOtp';

describe('otpTypesToTry', () => {
  it('tries signup then email for confirmation links', () => {
    expect(otpTypesToTry('signup')).toEqual(['signup', 'email', 'invite']);
  });

  it('keeps recovery as a single type', () => {
    expect(otpTypesToTry('recovery')).toEqual(['recovery']);
  });

  it('dedupes email-first', () => {
    expect(otpTypesToTry('email')[0]).toBe('email');
    expect(new Set(otpTypesToTry('email')).size).toBe(otpTypesToTry('email').length);
  });
});