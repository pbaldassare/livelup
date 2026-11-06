// =====================================================
// Segnali fine timer: vibrazione (Vibration API) + beep Web Audio.
// Uso: allenamento mobile — alert negli ultimi secondi senza guardare lo schermo.
// =====================================================

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx || audioCtx.state === 'closed') {
    try {
      audioCtx = new Ctx();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

/** Necessario su iOS/Safari: prima interazione utente. Chiamare al tap "Start" se serve. */
export async function resumeTimerAudioContext(): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      /* noop */
    }
  }
}

export function playTimerWarningBeep(freqHz = 880, durationMs = 70): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freqHz, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + durationMs / 1000 + 0.05);
}

export function vibrateTimerWarning(pattern: number | number[] = [35, 50, 35]): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* noop */
  }
}

export type TimerSignalKind = 'rest' | 'work' | 'round';

/** Soglia (secondi) → frequenza beep e pattern vibrazione */
export function fireTimerEndSignal(kind: TimerSignalKind, thresholdSeconds: number): void {
  const freq =
    kind === 'rest'
      ? thresholdSeconds <= 1
        ? 740
        : 660
      : kind === 'work'
        ? thresholdSeconds <= 1
          ? 920
          : 820
        : 800;
  playTimerWarningBeep(freq, thresholdSeconds <= 1 ? 95 : 75);
  vibrateTimerWarning(
    thresholdSeconds <= 1 ? [45, 60, 45, 60, 45] : [40, 35, 40],
  );
}
