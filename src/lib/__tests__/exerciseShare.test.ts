import { describe, expect, it } from 'vitest';
import {
  buildExerciseShareMessageContent,
  EXERCISE_SHARE_ATTACHMENT_TYPE,
  isExerciseShareAttachment,
  parseExerciseSharePayload,
  serializeExerciseSharePayload,
} from '@/lib/exerciseShare';

const sample = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Back lever',
  description: 'Tieni il corpo parallelo.',
  category: 'Calisthenics',
  muscle_groups: ['Dorsali', 'Core'],
  difficulty_level: 'avanzato',
  video_url: 'https://youtu.be/abc',
  image_url: null,
  instructions: 'Spalle chiuse, bacino in retroversione.',
};

describe('exerciseShare', () => {
  it('round-trips a snapshot in the chat payload', () => {
    const raw = serializeExerciseSharePayload(sample);
    expect(JSON.parse(raw).v).toBe(1);
    expect(parseExerciseSharePayload(raw)).toEqual(sample);
  });

  it('rejects garbage and empty payloads', () => {
    expect(parseExerciseSharePayload(null)).toBeNull();
    expect(parseExerciseSharePayload('not-json')).toBeNull();
    expect(parseExerciseSharePayload('{"name":"x"}')).toBeNull();
  });

  it('builds a human-readable chat/notification preview', () => {
    expect(buildExerciseShareMessageContent('Back lever')).toBe(
      'Ti consiglio questo esercizio: Back lever',
    );
  });

  it('recognizes the share attachment type', () => {
    expect(isExerciseShareAttachment(EXERCISE_SHARE_ATTACHMENT_TYPE)).toBe(true);
    expect(isExerciseShareAttachment('video')).toBe(false);
  });
});
