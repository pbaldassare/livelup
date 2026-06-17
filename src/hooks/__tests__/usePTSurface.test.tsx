import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { usePTSurface, mapPTWebToApp } from '../usePTSurface';

// =====================================================
// Helpers: control matchMedia and window.location.search
// per-test, then restore.
// =====================================================

type MQ = {
  matches: boolean;
  media: string;
  onchange: null;
  addEventListener: () => void;
  removeEventListener: () => void;
  addListener: () => void;
  removeListener: () => void;
  dispatchEvent: () => boolean;
};

function setMatchMedia(matchers: Record<string, boolean>) {
  window.matchMedia = ((query: string): MQ => ({
    matches: matchers[query] ?? false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

function setSearch(search: string) {
  // jsdom: override window.location.search via history.replaceState
  window.history.replaceState({}, '', `/${search ? '?' + search : ''}`);
}

const NARROW = '(max-width: 767px)';
const STANDALONE = '(display-mode: standalone)';

beforeEach(() => {
  setSearch('');
  setMatchMedia({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// =====================================================
// usePTSurface
// =====================================================

describe('usePTSurface', () => {
  it('returns "web" on desktop browser (wide + not standalone, no override)', () => {
    setMatchMedia({ [NARROW]: false, [STANDALONE]: false });
    const { result } = renderHook(() => usePTSurface());
    expect(result.current).toBe('web');
  });

  it('returns "app" when viewport is narrow (mobile)', () => {
    setMatchMedia({ [NARROW]: true, [STANDALONE]: false });
    const { result } = renderHook(() => usePTSurface());
    expect(result.current).toBe('app');
  });

  it('returns "app" when running as installed PWA (standalone)', () => {
    setMatchMedia({ [NARROW]: false, [STANDALONE]: true });
    const { result } = renderHook(() => usePTSurface());
    expect(result.current).toBe('app');
  });

  it('returns "app" when iOS standalone flag is set even if not narrow', () => {
    setMatchMedia({ [NARROW]: false, [STANDALONE]: false });
    (navigator as unknown as { standalone?: boolean }).standalone = true;
    try {
      const { result } = renderHook(() => usePTSurface());
      expect(result.current).toBe('app');
    } finally {
      delete (navigator as unknown as { standalone?: boolean }).standalone;
    }
  });

  describe('?view= override', () => {
    it('forces "web" when ?view=web is present on a mobile viewport', () => {
      setMatchMedia({ [NARROW]: true, [STANDALONE]: false });
      setSearch('view=web');
      const { result } = renderHook(() => usePTSurface());
      expect(result.current).toBe('web');
    });

    it('forces "web" when ?view=web is present in installed PWA', () => {
      setMatchMedia({ [NARROW]: false, [STANDALONE]: true });
      setSearch('view=web');
      const { result } = renderHook(() => usePTSurface());
      expect(result.current).toBe('web');
    });

    it('forces "app" when ?view=app is present on desktop', () => {
      setMatchMedia({ [NARROW]: false, [STANDALONE]: false });
      setSearch('view=app');
      const { result } = renderHook(() => usePTSurface());
      expect(result.current).toBe('app');
    });

    it('ignores unrelated query params', () => {
      setMatchMedia({ [NARROW]: true, [STANDALONE]: false });
      setSearch('foo=bar');
      const { result } = renderHook(() => usePTSurface());
      expect(result.current).toBe('app');
    });
  });
});

// =====================================================
// mapPTWebToApp
// =====================================================

describe('mapPTWebToApp', () => {
  it.each([
    ['/pt', '/pt/app'],
    ['/pt/', '/pt/app'],
    ['/pt/athletes', '/pt/app/athletes'],
    ['/pt/athletes/abc-123', '/pt/app/athlete/abc-123'],
    ['/pt/workouts', '/pt/app/workouts'],
    ['/pt/templates/tpl-1', '/pt/app/templates/tpl-1'],
    ['/pt/templates', '/pt/app/templates'],
    ['/pt/calendar', '/pt/app/calendar'],
    ['/pt/calendar/eventi', '/pt/app/calendar'],
    ['/pt/calendar/appuntamenti', '/pt/app/calendar'],
    ['/pt/messages', '/pt/app/chat'],
    ['/pt/exercises', '/pt/app/exercises'],
    ['/pt/coupons', '/pt/app/coupons'],
    ['/pt/payments', '/pt/app/payments'],
    ['/pt/blog', '/pt/app/blog'],
    ['/pt/settings', '/pt/app/settings'],
  ])('maps %s → %s', (input, expected) => {
    expect(mapPTWebToApp(input)).toBe(expected);
  });


  it('keeps /pt/onboarding untouched (shared between surfaces)', () => {
    expect(mapPTWebToApp('/pt/onboarding')).toBe('/pt/onboarding');
    expect(mapPTWebToApp('/pt/onboarding/step-2')).toBe('/pt/onboarding/step-2');
  });

  it('falls back to /pt/app for unknown /pt subpaths', () => {
    expect(mapPTWebToApp('/pt/something-new')).toBe('/pt/app');
  });
});

// =====================================================
// Integration: surface gate "redirects" /pt/* → /pt/app/*
// =====================================================

/**
 * Mini-router that reproduces the gate used in PTDashboardLayout:
 * if surface === 'app' AND path is on /pt (not /pt/app), Navigate to
 * mapPTWebToApp(path). Otherwise render a marker for the current path.
 */
function SurfaceGate() {
  const location = useLocation();
  const surface = usePTSurface();

  if (surface === 'app' && !location.pathname.startsWith('/pt/app')) {
    return <Navigate to={mapPTWebToApp(location.pathname)} replace />;
  }
  return <div data-testid="rendered-path">{location.pathname}</div>;
}

function renderAt(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/pt/*" element={<SurfaceGate />} />
        <Route path="/pt/app/*" element={<SurfaceGate />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Surface gate redirect (e2e-style)', () => {
  it('does NOT redirect on desktop: /pt stays as /pt', () => {
    setMatchMedia({ [NARROW]: false, [STANDALONE]: false });
    renderAt('/pt');
    expect(screen.getByTestId('rendered-path').textContent).toBe('/pt');
  });

  it('redirects /pt → /pt/app on mobile viewport', () => {
    setMatchMedia({ [NARROW]: true, [STANDALONE]: false });
    renderAt('/pt');
    expect(screen.getByTestId('rendered-path').textContent).toBe('/pt/app');
  });

  it('redirects /pt/calendar/eventi → /pt/app/calendar on mobile', () => {
    setMatchMedia({ [NARROW]: true, [STANDALONE]: false });
    renderAt('/pt/calendar/eventi');
    expect(screen.getByTestId('rendered-path').textContent).toBe('/pt/app/calendar');
  });

  it('redirects every legacy /pt/* surface when installed as PWA (standalone)', () => {
    setMatchMedia({ [NARROW]: false, [STANDALONE]: true });
    const cases: Array<[string, string]> = [
      ['/pt', '/pt/app'],
      ['/pt/athletes', '/pt/app/athletes'],
      ['/pt/workouts', '/pt/app/workouts'],
      ['/pt/messages', '/pt/app/chat'],
      ['/pt/coupons', '/pt/app/coupons'],
      ['/pt/payments', '/pt/app/payments'],
      ['/pt/blog', '/pt/app/blog'],
      ['/pt/settings', '/pt/app/settings'],
      ['/pt/exercises', '/pt/app/exercises'],
    ];
    for (const [from, to] of cases) {
      const { unmount } = renderAt(from);
      expect(screen.getByTestId('rendered-path').textContent).toBe(to);
      unmount();
    }
  });

  it('does NOT redirect when already on /pt/app/*', () => {
    setMatchMedia({ [NARROW]: true, [STANDALONE]: true });
    renderAt('/pt/app/athletes');
    expect(screen.getByTestId('rendered-path').textContent).toBe('/pt/app/athletes');
  });

  it('respects ?view=web override even on mobile', () => {
    setMatchMedia({ [NARROW]: true, [STANDALONE]: false });
    setSearch('view=web');
    renderAt('/pt/athletes');
    expect(screen.getByTestId('rendered-path').textContent).toBe('/pt/athletes');
  });
});
