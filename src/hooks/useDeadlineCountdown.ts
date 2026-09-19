import { useEffect, useRef, useState } from 'react';
import { remainingFromDeadline } from '@/lib/workoutClock';

function bindResumeListeners(onResume: () => void): () => void {
  document.addEventListener('visibilitychange', onResume);
  window.addEventListener('pageshow', onResume);
  window.addEventListener('focus', onResume);
  return () => {
    document.removeEventListener('visibilitychange', onResume);
    window.removeEventListener('pageshow', onResume);
    window.removeEventListener('focus', onResume);
  };
}

/**
 * Countdown da una scadenza assoluta. Al blocco schermo / background
 * i setInterval si fermano, ma al resume ricalcola da Date.now().
 */
export function useDeadlineCountdown(
  endsAtMs: number | null,
  onReachedZero?: () => void,
): number {
  const [left, setLeft] = useState(() => remainingFromDeadline(endsAtMs));
  const doneRef = useRef(false);
  const onZeroRef = useRef(onReachedZero);
  onZeroRef.current = onReachedZero;

  useEffect(() => {
    doneRef.current = false;
  }, [endsAtMs]);

  useEffect(() => {
    if (endsAtMs == null) {
      setLeft(0);
      return;
    }

    const tick = () => {
      const next = remainingFromDeadline(endsAtMs);
      setLeft(next);
      if (next <= 0 && !doneRef.current) {
        doneRef.current = true;
        onZeroRef.current?.();
      }
    };

    tick();
    const id = window.setInterval(tick, 250);
    const unbind = bindResumeListeners(tick);
    return () => {
      window.clearInterval(id);
      unbind();
    };
  }, [endsAtMs]);

  return left;
}

/**
 * Tempo trascorso da un istante, in secondi. Si ferma se startedAtMs è null.
 */
export function useWallClockElapsed(startedAtMs: number | null): number {
  const [elapsed, setElapsed] = useState(() =>
    startedAtMs == null ? 0 : Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)),
  );

  useEffect(() => {
    if (startedAtMs == null) return;

    const tick = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)));
    };

    tick();
    const id = window.setInterval(tick, 250);
    const unbind = bindResumeListeners(tick);
    return () => {
      window.clearInterval(id);
      unbind();
    };
  }, [startedAtMs]);

  return elapsed;
}
