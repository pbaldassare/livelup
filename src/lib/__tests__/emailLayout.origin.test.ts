import { describe, expect, it } from 'vitest';
import {
  authActionAppUrl,
  loginUrl,
  normalizeAppOrigin,
  resolveAppOrigin,
  wrapLivelappEmail,
} from '../../../supabase/functions/_shared/emailLayout';
import { authEmailCopy, buildAuthLinkEmail } from '../../../supabase/functions/_shared/emailCopy';

describe('email origin and brand', () => {
  it('rewrites stale custom domains to Cloudflare Pages', () => {
    expect(normalizeAppOrigin('https://livelapp.iaconnect.it')).toBe('https://livelup.pages.dev');
    expect(normalizeAppOrigin('https://livelapp.it/')).toBe('https://livelup.pages.dev');
    expect(normalizeAppOrigin('https://livelup.pages.dev')).toBe('https://livelup.pages.dev');
  });

  it('builds auth and login URLs on Pages even if SITE_URL is iaconnect', () => {
    (globalThis as { Deno?: { env: { get: (key: string) => string | undefined } } }).Deno = {
      env: {
        get: (key) => (key === 'SITE_URL' ? 'https://livelapp.iaconnect.it' : undefined),
      },
    };

    expect(resolveAppOrigin()).toBe('https://livelup.pages.dev');
    expect(loginUrl()).toBe('https://livelup.pages.dev/auth');

    for (const action of ['signup', 'recovery', 'invite', 'magiclink', 'email_change']) {
      const url = authActionAppUrl(action, 'token-hash-fixture');
      expect(url).toContain('https://livelup.pages.dev/auth');
      expect(url).toContain(`type=${action}`);
      expect(url).not.toContain('iaconnect');
      expect(url).not.toContain('livelapp.it');
    }
  });

  it('wraps mail with logo and brand red, not teal dashboard chrome', () => {
    const html = wrapLivelappEmail({
      title: 'Test',
      headline: 'Ciao',
      bodyHtml: '<p>corpo</p>',
    });
    expect(html).toContain('https://livelup.pages.dev/livelapp-icon.png');
    expect(html).toContain('#E73235');
    expect(html).not.toContain('#0d4f4f');
    expect(html).not.toContain('iaconnect');
  });

  it('keeps branded copy for every auth action type', () => {
    for (const action of ['signup', 'recovery', 'invite', 'magiclink', 'email_change']) {
      const mail = buildAuthLinkEmail({
        actionType: action,
        confirmationUrl: authActionAppUrl(action, 'abc'),
        email: 'demo@example.com',
        role: 'atleta',
      });
      expect(mail.html).toContain('livelapp-icon.png');
      expect(mail.html).toContain('https://livelup.pages.dev/auth');
      expect(mail.html).not.toContain('iaconnect');
      expect(authEmailCopy(action, 'pt').subject.toLowerCase()).toContain('livelapp');
    }
  });
});
