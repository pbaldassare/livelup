import { describe, expect, it } from 'vitest';
import { PUBLIC_APP_ORIGIN, resolvePublicAppOrigin } from '../publicOrigin';

describe('resolvePublicAppOrigin', () => {
  it('keeps Cloudflare Pages production', () => {
    expect(resolvePublicAppOrigin('livelup.pages.dev', 'https://livelup.pages.dev')).toBe(
      'https://livelup.pages.dev',
    );
  });

  it('does not send invites to the stale Lovable custom domain', () => {
    expect(resolvePublicAppOrigin('livelapp.iaconnect.it', 'https://livelapp.iaconnect.it')).toBe(
      PUBLIC_APP_ORIGIN,
    );
    expect(resolvePublicAppOrigin('livelapp.it', 'https://livelapp.it')).toBe(PUBLIC_APP_ORIGIN);
  });

  it('maps localhost and Pages previews to Pages production', () => {
    expect(resolvePublicAppOrigin('localhost', 'http://localhost:8080')).toBe(PUBLIC_APP_ORIGIN);
    expect(
      resolvePublicAppOrigin('cursor-invite-signup-athlete.livelup.pages.dev', 'https://x.pages.dev'),
    ).toBe(PUBLIC_APP_ORIGIN);
  });
});
