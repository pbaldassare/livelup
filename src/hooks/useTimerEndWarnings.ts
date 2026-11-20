import { useEffect, useRef } from 'react';
import { fireTimerEndSignal, type TimerSignalKind } from '@/lib/timerEndSignals';
import {
  getTimerPreferences,
  isInTimerWarningWindow,
  timerPulseIntervalMs,
} from '@/lib/timerPreferences';

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
  /** Override della finestra (secondi). Default: preferenza utente. */
  leadSeconds?: number;
  kind?: TimerSignalKind;
}

/**
 * Emette vibrazione + beep in modo continuo negli ultimi N secondi:
 * un impulso all'ingresso nella finestra, poi ripetuti a ritmo dell'intensità.
 */
export function useTimerEndWarnings({
  enabled,
  secondsLeft,
  phaseKey,
  leadSeconds,
  kind = 'rest',
}: UseTimerEndWarningsOptions): void {
  const phaseKeyRef = useRef(phaseKey);

  useEffect(() => {
    phaseKeyRef.current = phaseKey;
  }, [phaseKey]);

  useEffect(() => {
    if (!enabled) return;

    const prefs = getTimerPreferences();
    const windowSeconds = leadSeconds ?? prefs.leadSeconds;
    if (!isInTimerWarningWindow(secondsLeft, windowSeconds)) return;

    fireTimerEndSignal(kind, secondsLeft);
    const intervalMs = timerPulseIntervalMs(prefs.intensity);
    const id = window.setInterval(() => {
      fireTimerEndSignal(kind, secondsLeft);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [enabled, secondsLeft, leadSeconds, kind, phaseKey]);
}
