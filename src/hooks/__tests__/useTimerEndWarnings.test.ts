import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTimerEndWarnings } from '@/hooks/useTimerEndWarnings';

const fireSpy = vi.fn();

vi.mock('@/lib/timerEndSignals', () => ({
  fireTimerEndSignal: (...args: unknown[]) => fireSpy(...args),
}));

describe('useTimerEndWarnings', () => {
  beforeEach(() => {
    fireSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fires once per threshold when crossing down', () => {
    const { rerender } = renderHook(
      ({ left }: { left: number }) =>
        useTimerEndWarnings({ enabled: true, secondsLeft: left, phaseKey: 'a', kind: 'rest' }),
      { initialProps: { left: 10 } },
    );
    rerender({ left: 4 });
    rerender({ left: 2 });
    rerender({ left: 0 });
    expect(fireSpy).toHaveBeenCalledTimes(2);
    expect(fireSpy).toHaveBeenCalledWith('rest', 5);
    expect(fireSpy).toHaveBeenCalledWith('rest', 3);
  });

  it('resets on phaseKey change', () => {
    const { rerender } = renderHook(
      ({ left, phaseKey }: { left: number; phaseKey: string }) =>
        useTimerEndWarnings({ enabled: true, secondsLeft: left, phaseKey, kind: 'rest' }),
      { initialProps: { left: 4, phaseKey: 'round-1' } },
    );
    rerender({ left: 2, phaseKey: 'round-1' });
    expect(fireSpy).toHaveBeenCalledTimes(1);

    rerender({ left: 4, phaseKey: 'round-2' });
    rerender({ left: 2, phaseKey: 'round-2' });
    expect(fireSpy).toHaveBeenCalledTimes(2);
  });
});
