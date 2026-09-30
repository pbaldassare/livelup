import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SECONDS_PER_REP,
  estimateCourseSeconds,
  estimateCourseStepSeconds,
  estimateExerciseRowDuration,
  estimateRoutineExerciseListSeconds,
  estimateSheetDuration,
  formatEstimatedDuration,
  parseRepsText,
  parseTempoSeconds,
  secondsToRoundedMinutes,
  sumSequence,
} from '@/lib/workoutDuration';

describe('parseTempoSeconds', () => {
  it('somma le 4 cifre della cadenza', () => {
    expect(parseTempoSeconds('3010')).toBe(4);
    expect(parseTempoSeconds('2-1-2-0')).toBe(5);
    expect(parseTempoSeconds('31X1')).toBe(6);
  });

  it('ignora formati non validi', () => {
    expect(parseTempoSeconds(null)).toBeNull();
    expect(parseTempoSeconds('lento')).toBeNull();
    expect(parseTempoSeconds('301')).toBeNull();
    expect(parseTempoSeconds('0000')).toBeNull();
  });
});

describe('parseRepsText', () => {
  it('gestisce numeri, range e testo', () => {
    expect(parseRepsText('10')).toBe(10);
    expect(parseRepsText('8-12')).toBe(10);
    expect(parseRepsText('max')).toBe(10);
    expect(parseRepsText(null)).toBe(10);
    expect(parseRepsText(6)).toBe(6);
  });
});

describe('estimateExerciseRowDuration — set standard', () => {
  it('serie × reps × 3s + recuperi tra le serie, recupero finale separato', () => {
    const d = estimateExerciseRowDuration({ protocol_type: 'SET', sets: 3, reps_min: 10, rest_seconds: 60 });
    // 3 × 30s lavoro + 2 × 60s recupero
    expect(d.seconds).toBe(3 * 10 * DEFAULT_SECONDS_PER_REP + 2 * 60);
    expect(d.trailingRestSeconds).toBe(60);
  });

  it('usa il tempo (cadenza) se presente', () => {
    const d = estimateExerciseRowDuration({ sets: 2, reps_min: 5, rest_seconds: 90, tempo: '3010' });
    expect(d.seconds).toBe(2 * 5 * 4 + 90);
  });

  it('set a tempo usano duration_seconds', () => {
    const d = estimateExerciseRowDuration({ sets: 3, prescribed_duration_seconds: 45, rest_seconds: 30 });
    expect(d.seconds).toBe(3 * 45 + 2 * 30);
  });

  it('rispetta sets_data eterogenei', () => {
    const d = estimateExerciseRowDuration({
      protocol_type: 'SET',
      sets_data: [
        { mode: 'reps', reps: 12, rest_seconds: 60, weight: null },
        { mode: 'seconds', reps: null, duration_seconds: 40, rest_seconds: 90, weight: null },
        { mode: 'reps', reps: 8, rest_seconds: 120, weight: null },
      ],
    });
    expect(d.seconds).toBe(36 + 60 + 40 + 90 + 24);
    expect(d.trailingRestSeconds).toBe(120);
  });

  it('legge i campi prescribed_* delle righe workout', () => {
    const d = estimateExerciseRowDuration({ prescribed_sets: 4, prescribed_reps_min: 6, rest_seconds: 120 });
    expect(d.seconds).toBe(4 * 18 + 3 * 120);
  });
});

describe('estimateExerciseRowDuration — protocolli', () => {
  it('EMOM = round × durata round', () => {
    const d = estimateExerciseRowDuration({
      protocol_type: 'EMOM',
      protocol_params: { rounds: 12, round_duration: 60 },
    });
    expect(d).toEqual({ seconds: 720, trailingRestSeconds: 0 });
  });

  it('EMOM legacy con duration_minutes', () => {
    const d = estimateExerciseRowDuration({
      protocol_type: 'EMOM',
      protocol_params: { rounds: 10, duration_minutes: 1.5 },
    });
    expect(d.seconds).toBe(900);
  });

  it('AMRAP = time cap', () => {
    expect(
      estimateExerciseRowDuration({ protocol_type: 'AMRAP', protocol_params: { duration_seconds: 900 } }).seconds,
    ).toBe(900);
    expect(
      estimateExerciseRowDuration({ protocol_type: 'AMRAP', protocol_params: { duration_minutes: 12 } }).seconds,
    ).toBe(720);
  });

  it('Tabata / HIIT = round × (esercizi × lavoro + riposi) + recupero tra round', () => {
    const d = estimateExerciseRowDuration({
      protocol_type: 'TABATA',
      protocol_params: {
        rounds: 8,
        exercises_count: 2,
        exercise_duration_seconds: 20,
        rest_between_exercises_seconds: 10,
        rest_between_rounds_seconds: 60,
        exercises: [{ name: 'A' }, { name: 'B' }],
      },
    });
    // round = 2×20 + 1×10 = 50 → 8×50 + 7×60
    expect(d.seconds).toBe(400 + 420);
  });

  it('Superset = per superset lavoro A+B + recupero interno, recupero tra superset', () => {
    const d = estimateExerciseRowDuration({
      protocol_type: 'SUPERSET',
      protocol_params: {
        supersets_count: 3,
        rest_between_supersets: 90,
        rest_between_exercises_enabled: true,
        rest_between_exercises: 15,
        exercises: [
          { name: 'A', reps: 10 },
          { name: 'B', mode: 'seconds', duration_seconds: 30 },
        ],
      },
    });
    // per superset: 30 + 30 + 15 = 75 → 3×75 + 2×90
    expect(d.seconds).toBe(225 + 180);
    expect(d.trailingRestSeconds).toBe(90);
  });

  it('Ladder = serie × (somma scalini × s/rep + recuperi scalino) + recupero tra serie', () => {
    const d = estimateExerciseRowDuration({
      protocol_type: 'LADDER',
      protocol_params: { ladder_steps: [1, 2, 3], sets: 2, step_rest_seconds: 20, set_rest_seconds: 90 },
    });
    // per serie: 6 reps × 3 + 2 × 20 = 58 → 2×58 + 90
    expect(d.seconds).toBe(116 + 90);
  });

  it('RxT = round × somma esercizi + pausa max', () => {
    const d = estimateExerciseRowDuration({
      protocol_type: 'RXT',
      protocol_params: {
        rounds: 3,
        max_rest_seconds: 30,
        exercises: [{ name: 'A', reps: 10 }, { name: 'B', reps: 20 }],
      },
    });
    expect(d.seconds).toBe(3 * 90 + 2 * 30);
  });

  it('Top set + back off', () => {
    const d = estimateExerciseRowDuration({
      protocol_type: 'TOP_SET_BACKOFF',
      protocol_params: { top_sets: 1, top_reps: 5, top_rest: 120, backoff_sets: 3, backoff_reps: 8 },
    });
    // lavoro (5 + 24) × 3 = 87, 3 recuperi interni
    expect(d.seconds).toBe(87 + 3 * 120);
  });
});

describe('estimateSheetDuration', () => {
  it('somma gli item escludendo solo il recupero dopo l’ultimo', () => {
    const rows = [
      { sets: 3, reps_min: 10, rest_seconds: 60 },
      { protocol_type: 'AMRAP', protocol_params: { duration_seconds: 600 } },
      { sets: 2, reps_min: 10, rest_seconds: 60 },
    ];
    const d = estimateSheetDuration(rows);
    // (90+120) + 60 transizione + 600 + (60+60), ultimo recupero escluso
    expect(d.mainSeconds).toBe(210 + 60 + 600 + 120);
  });

  it('riscaldamento e stretching restano fuori dal totale principale', () => {
    const d = estimateSheetDuration([
      { phase: 'warmup', sets: 1, reps_min: 10, rest_seconds: 30 },
      { phase: 'main', sets: 1, reps_min: 10, rest_seconds: 30 },
      { phase: 'cooldown', prescribed_duration_seconds: 60, sets: 1, rest_seconds: 0 },
    ]);
    expect(d).toEqual({ mainSeconds: 30, warmupSeconds: 30, cooldownSeconds: 60 });
  });

  it('scheda vuota = 0', () => {
    expect(estimateSheetDuration([]).mainSeconds).toBe(0);
    expect(sumSequence([])).toBe(0);
  });

  it('lista esercizi routine usa 1×10 con 30" di recupero', () => {
    expect(estimateRoutineExerciseListSeconds(3)).toBe(3 * 30 + 2 * 30);
    expect(estimateRoutineExerciseListSeconds(0)).toBe(0);
  });
});

describe('corsi', () => {
  it('step esercizi calcolato da serie/reps testuali/recupero', () => {
    const s = estimateCourseStepSeconds({
      step_type: 'exercises',
      pt_course_step_exercises: [
        { sets: 3, reps: '8-12', rest_seconds: 60 },
        { sets: 2, reps: '5', rest_seconds: 90 },
      ],
    });
    // (90 + 120) + 60 + (30 + 90)
    expect(s).toBe(210 + 60 + 120);
  });

  it('step video usa la durata indicata, altrimenti 0', () => {
    expect(estimateCourseStepSeconds({ step_type: 'video', video_duration_minutes: 12 })).toBe(720);
    expect(estimateCourseStepSeconds({ step_type: 'video', video_duration_minutes: null })).toBe(0);
  });

  it('corso = somma degli step', () => {
    expect(
      estimateCourseSeconds([
        { step_type: 'video', video_duration_minutes: 5 },
        { step_type: 'exercises', pt_course_step_exercises: [{ sets: 1, reps: '10', rest_seconds: 0 }] },
      ]),
    ).toBe(300 + 30);
    expect(estimateCourseSeconds(null)).toBe(0);
  });
});

describe('formattazione', () => {
  it('arrotonda al minuto', () => {
    expect(secondsToRoundedMinutes(0)).toBeNull();
    expect(secondsToRoundedMinutes(20)).toBe(1);
    expect(secondsToRoundedMinutes(2690)).toBe(45);
  });

  it('formatta minuti e ore', () => {
    expect(formatEstimatedDuration(0)).toBe('—');
    expect(formatEstimatedDuration(45 * 60)).toBe('~45 min');
    expect(formatEstimatedDuration(60 * 60)).toBe('~1 h');
    expect(formatEstimatedDuration(75 * 60)).toBe('~1 h 15 min');
  });
});
