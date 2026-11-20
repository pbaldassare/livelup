// =====================================================
// Segnali fine timer: vibrazione (Vibration API) + beep Web Audio.
// Impulsi ripetuti negli ultimi N secondi, più densi vicino allo zero.
// Preferenze: src/lib/timerPreferences.ts (Profilo / Impostazioni atleta).
// =====================================================

import {
  getTimerPreferences,
  type TimerIntensity,
  type TimerPreferences,
} from '@/lib/timerPreferences';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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

export type TimerSignalKind = 'rest' | 'work' | 'round';

export type TimerBeepSpec = {
  freqHz: number;
  durationMs: number;
  gain: number;
  type: OscillatorType;
};

export type TimerVibrationSpec = number[];

export function timerBeepSpec(
  kind: TimerSignalKind,
  secondsLeft: number,
  intensity: TimerIntensity,
): TimerBeepSpec {
  const urgent = secondsLeft <= 1;
  const baseFreq =
    kind === 'rest' ? (urgent ? 780 : 660) : kind === 'work' ? (urgent ? 980 : 840) : 820;
  const gainByIntensity = { low: 0.1, medium: 0.2, high: 0.38 }[intensity];
  const durationByIntensity = { low: 90, medium: 140, high: 190 }[intensity];
  return {
    freqHz: urgent ? baseFreq + 80 : baseFreq,
    durationMs: durationByIntensity + (urgent ? 90 : 0),
    gain: Math.min(0.45, gainByIntensity * (urgent ? 1.35 : 1)),
    type: intensity === 'high' ? 'square' : intensity === 'medium' ? 'triangle' : 'sine',
  };
}

export function timerVibrationSpec(secondsLeft: number, intensity: TimerIntensity): TimerVibrationSpec {
  if (intensity === 'high') {
    return secondsLeft <= 1
      ? [110, 35, 110, 35, 110, 35, 140]
      : [80, 40, 80, 40, 100];
  }
  if (intensity === 'medium') {
    return secondsLeft <= 1 ? [70, 50, 70, 50, 90] : [55, 70, 55];
  }
  return secondsLeft <= 1 ? [50, 80, 50] : [40];
}

export function playTimerWarningBeep(
  freqHz = 880,
  durationMs = 70,
  options?: { gain?: number; type?: OscillatorType },
): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const peak = Math.max(0.02, Math.min(0.45, options?.gain ?? 0.12));
  const dur = Math.max(0.04, durationMs / 1000);
  osc.type = options?.type ?? 'sine';
  osc.frequency.setValueAtTime(freqHz, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + dur + 0.04);
}

export function vibrateTimerWarning(pattern: number | number[] = [35, 50, 35]): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* noop */
  }
}

export function fireTimerEndSignal(
  kind: TimerSignalKind,
  thresholdSeconds: number,
  prefsOverride?: Partial<TimerPreferences>,
): void {
  const prefs = { ...getTimerPreferences(), ...prefsOverride };
  const beep = timerBeepSpec(kind, thresholdSeconds, prefs.intensity);
  if (prefs.soundEnabled) {
    playTimerWarningBeep(beep.freqHz, beep.durationMs, {
      gain: beep.gain,
      type: beep.type,
    });
  }
  if (prefs.vibrationEnabled) {
    vibrateTimerWarning(timerVibrationSpec(thresholdSeconds, prefs.intensity));
  }
}

export function previewTimerSignals(kind: TimerSignalKind = 'rest'): void {
  void resumeTimerAudioContext();
  fireTimerEndSignal(kind, 1);
}
