import { describe, expect, it } from 'vitest';
import { describeAuthError } from '@/lib/authErrors';

describe('describeAuthError', () => {
  it('maps expired confirmation links', () => {
    const r = describeAuthError('Email link is invalid or has expired');
    expect(r.title).toMatch(/Link non valido/i);
    expect(r.description).toMatch(/WhatsApp/i);
  });

  it('maps unconfirmed login', () => {
    const r = describeAuthError('Email not confirmed');
    expect(r.title).toMatch(/non confermata/i);
  });

  it('maps invalid credentials with signup hint', () => {
    const r = describeAuthError('Invalid login credentials');
    expect(r.description).toMatch(/conferma/i);
  });
});