import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTimerEndWarnings } from '@/hooks/useTimerEndWarnings';

const fireSpy = vi.fn();

vi.mock('@/lib/timerEndSignals', () => ({
  fireTimerEndSignal: (...args: unknown[]) => fireSpy(...args),
}));

vi.mock('@/lib/timerPreferences', async () => {
  const actual = await vi.importActual<typeof import('@/lib/timerPreferences')>(
    '@/lib/timerPreferences',
  );
  return {
    ...actual,
    getTimerPreferences: () => ({
      soundEnabled: true,
      vibrationEnabled: true,
      intensity: 'high' as const,
      leadSeconds: 5 as const,
    }),
  };
});

describe('useTimerEndWarnings', () => {
  beforeEach(() => {
    fireSpy.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('does not fire outside the lead window', () => {
    renderHook(() =>
      useTimerEndWarnings({ enabled: true, secondsLeft: 10, phaseKey: 'a', kind: 'rest' }),
    );
    expect(fireSpy).not.toHaveBeenCalled();
  });

  it('pulses continuously while inside the window', () => {
    renderHook(() =>
      useTimerEndWarnings({ enabled: true, secondsLeft: 4, phaseKey: 'a', kind: 'rest' }),
    );
    expect(fireSpy).toHaveBeenCalledTimes(1);
    expect(fireSpy).toHaveBeenCalledWith('rest', 4);
    vi.advanceTimersByTime(260);
    expect(fireSpy).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(260);
    expect(fireSpy).toHaveBeenCalledTimes(3);
  });

  it('stops pulsing when the phase leaves the window', () => {
    const { rerender } = renderHook(
      ({ left }: { left: number }) =>
        useTimerEndWarnings({ enabled: true, secondsLeft: left, phaseKey: 'a', kind: 'rest' }),
      { initialProps: { left: 2 } },
    );
    expect(fireSpy).toHaveBeenCalledTimes(1);
    rerender({ left: 0 });
    vi.advanceTimersByTime(800);
    expect(fireSpy).toHaveBeenCalledTimes(1);
  });
});
