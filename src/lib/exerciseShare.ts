import { getOrCreateChat, sendMessage } from '@/lib/api/messages';

/** Marker on messages.attachment_type — not a file, not a workout. */
export const EXERCISE_SHARE_ATTACHMENT_TYPE = 'exercise/share';

export type SharedExerciseSnapshot = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  muscle_groups: string[];
  difficulty_level: string;
  video_url: string | null;
  image_url: string | null;
  instructions: string | null;
};

type StoredPayload = SharedExerciseSnapshot & { v: 1 };

export function isExerciseShareAttachment(type: string | null | undefined): boolean {
  return type === EXERCISE_SHARE_ATTACHMENT_TYPE || type === 'exercise';
}

export function toSharedExerciseSnapshot(exercise: SharedExerciseSnapshot): SharedExerciseSnapshot {
  return {
    id: exercise.id,
    name: exercise.name,
    description: exercise.description ?? null,
    category: exercise.category || '',
    muscle_groups: Array.isArray(exercise.muscle_groups) ? exercise.muscle_groups : [],
    difficulty_level: exercise.difficulty_level || '',
    video_url: exercise.video_url ?? null,
    image_url: exercise.image_url ?? null,
    instructions: exercise.instructions ?? null,
  };
}

export function serializeExerciseSharePayload(exercise: SharedExerciseSnapshot): string {
  const snapshot = toSharedExerciseSnapshot(exercise);
  const payload: StoredPayload = { v: 1, ...snapshot };
  return JSON.stringify(payload);
}

export function parseExerciseSharePayload(raw: string | null | undefined): SharedExerciseSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredPayload>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.id !== 'string' || !parsed.id) return null;
    if (typeof parsed.name !== 'string' || !parsed.name) return null;
    return toSharedExerciseSnapshot({
      id: parsed.id,
      name: parsed.name,
      description: typeof parsed.description === 'string' ? parsed.description : null,
      category: typeof parsed.category === 'string' ? parsed.category : '',
      muscle_groups: Array.isArray(parsed.muscle_groups)
        ? parsed.muscle_groups.filter((m): m is string => typeof m === 'string')
        : [],
      difficulty_level: typeof parsed.difficulty_level === 'string' ? parsed.difficulty_level : '',
      video_url: typeof parsed.video_url === 'string' ? parsed.video_url : null,
      image_url: typeof parsed.image_url === 'string' ? parsed.image_url : null,
      instructions: typeof parsed.instructions === 'string' ? parsed.instructions : null,
    });
  } catch {
    return null;
  }
}

export function buildExerciseShareMessageContent(name: string): string {
  return `Ti consiglio questo esercizio: ${name}`;
}

export async function shareExerciseToAthletes(params: {
  ptUserId: string;
  athleteUserIds: string[];
  exercise: SharedExerciseSnapshot;
}): Promise<{ sent: number; failed: number }> {
  const uniqueIds = [...new Set(params.athleteUserIds.filter(Boolean))];
  const content = buildExerciseShareMessageContent(params.exercise.name);
  const attachmentUrl = serializeExerciseSharePayload(params.exercise);

  const results = await Promise.allSettled(
    uniqueIds.map(async (athleteUserId) => {
      const chat = await getOrCreateChat(params.ptUserId, athleteUserId);
      await sendMessage({
        chatId: chat.id,
        senderUserId: params.ptUserId,
        content,
        attachmentUrl,
        attachmentType: EXERCISE_SHARE_ATTACHMENT_TYPE,
      });
    }),
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  return { sent, failed: results.length - sent };
}
