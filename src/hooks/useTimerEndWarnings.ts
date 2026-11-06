import { useEffect, useRef } from 'react';
import { fireTimerEndSignal, type TimerSignalKind } from '@/lib/timerEndSignals';

export interface UseTimerEndWarningsOptions {
  /** Se false, non emette nulla (timer in pausa, schermo non attivo, ecc.) */
  enabled: boolean;
  /** Secondi rimanenti (ceil, come display); es. da useDeadlineCountdown */
  secondsLeft: number;
  /**
   * Cambia quando inizia un nuovo countdown (nuovo recupero, nuovo round, ecc.)
   * così le soglie possono ripartire.
   */
  phaseKey?: string | number | null;
  /** Secondi in cui avvisare (default 5, 3, 1) */
  thresholds?: number[];
  kind?: TimerSignalKind;
}

/**
 * Emette vibrazione + beep quando `secondsLeft` attraversa le soglie verso lo zero.
 * Non dipende da focus tab: il countdown è wall-clock; suono/vibrazione sì dove supportato.
 */
export function useTimerEndWarnings({
  enabled,
  secondsLeft,
  phaseKey,
  thresholds = [5, 3, 1],
  kind = 'rest',
}: UseTimerEndWarningsOptions): void {
  const prevLeftRef = useRef<number | null>(null);
  const signaledRef = useRef<Set<number>>(new Set());
  const phaseKeyRef = useRef(phaseKey);

  useEffect(() => {
    if (phaseKey !== phaseKeyRef.current) {
      phaseKeyRef.current = phaseKey;
      signaledRef.current.clear();
      prevLeftRef.current = null;
    }
  }, [phaseKey]);

  useEffect(() => {
    if (!enabled) {
      prevLeftRef.current = secondsLeft;
      return;
    }

    const prev = prevLeftRef.current;
    prevLeftRef.current = secondsLeft;

    if (prev !== null && secondsLeft > prev) {
      signaledRef.current.clear();
    }

    if (prev !== null && prev > 0 && secondsLeft === 0) {
      signaledRef.current.clear();
    }

    if (!enabled) return;

    const sorted = [...new Set(thresholds)].sort((a, b) => b - a);
    for (const t of sorted) {
      if (t <= 0) continue;
      if (prev !== null && prev > t && secondsLeft <= t && secondsLeft > 0) {
        if (!signaledRef.current.has(t)) {
          signaledRef.current.add(t);
          fireTimerEndSignal(kind, t);
        }
      }
    }
  }, [enabled, secondsLeft, thresholds, kind]);
}
