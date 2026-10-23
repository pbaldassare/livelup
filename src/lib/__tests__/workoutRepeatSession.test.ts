import { describe, expect, it } from 'vitest';
import {
  formatRepeatCompletionToast,
  formatRepeatSessionLabel,
  parseRepeatSessionMarker,
  resolveRepeatState,
  stripRepeatMarkers,
} from '@/lib/workoutRepeat';

const PARENT = '67730204-05f8-4539-a783-3fdd56a70b9d';
const snapDescription = `<!--livelapp-repeat-session:1/2:${PARENT}--> Forza base`;

describe('repeat session snapshot marker', () => {
  it('parses session, target and parent id', () => {
    expect(parseRepeatSessionMarker(snapDescription)).toEqual({
      session: 1,
      target: 2,
      parentWorkoutId: PARENT,
    });
  });

  it('returns null without marker', () => {
    expect(parseRepeatSessionMarker('<!--livelapp-repeat:2--> Forza base')).toBeNull();
    expect(parseRepeatSessionMarker(null)).toBeNull();
  });

  it('is stripped from visible text', () => {
    expect(stripRepeatMarkers(snapDescription)).toBe('Forza base');
  });

  it('does not turn the snapshot into a repeat assignment', () => {
    expect(resolveRepeatState({ description: snapDescription, repeat_target: 1 })).toEqual({
      repeatTarget: 1,
      repeatDone: 0,
    });
  });
});

describe('formatRepeatSessionLabel', () => {
  it('labels an intermediate snapshot', () => {
    expect(formatRepeatSessionLabel({ description: snapDescription })).toBe('Sessione 1 / 2');
  });

  it('labels the parent closed on the last session', () => {
    expect(
      formatRepeatSessionLabel({
        description: '<!--livelapp-repeat:2-->',
        notes_atleta: '<!--livelapp-repeat-done:2--> ok',
      }),
    ).toBe('Sessione 2 / 2');
  });

  it('returns null for one-shot workouts', () => {
    expect(formatRepeatSessionLabel({ description: 'Scheda singola', repeat_target: 1 })).toBeNull();
  });
});

describe('formatRepeatCompletionToast', () => {
  it('tells the athlete the session went to history', () => {
    expect(formatRepeatCompletionToast(1, 2).message).toBe(
      'Sessione 1 / 2 salvata nello storico. Ne resta 1.',
    );
  });
});
