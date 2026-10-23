export const CHAT_REACTION_EMOJIS = ['👍', '❤️', '😂', '🔥', '👏'] as const;

export type ChatReaction = {
  emoji: string;
  count: number;
  mine: boolean;
};

export function resolveReplyPreview(
  messages: { id: string; content: string | null; senderName: string }[],
  replyToId: string | null | undefined,
): { senderName: string; content: string } | undefined {
  if (!replyToId) return undefined;
  const parent = messages.find((m) => m.id === replyToId);
  if (!parent) return { senderName: '', content: 'Messaggio' };
  return {
    senderName: parent.senderName,
    content: parent.content?.trim() || 'Allegato',
  };
}

export function groupReactions(
  rows: { message_id: string; user_id: string; emoji: string }[],
  currentUserId: string,
): Map<string, ChatReaction[]> {
  const grouped = new Map<string, Map<string, { count: number; mine: boolean }>>();
  for (const row of rows) {
    let byEmoji = grouped.get(row.message_id);
    if (!byEmoji) {
      byEmoji = new Map();
      grouped.set(row.message_id, byEmoji);
    }
    const prev = byEmoji.get(row.emoji) ?? { count: 0, mine: false };
    byEmoji.set(row.emoji, {
      count: prev.count + 1,
      mine: prev.mine || row.user_id === currentUserId,
    });
  }
  const out = new Map<string, ChatReaction[]>();
  for (const [messageId, byEmoji] of grouped) {
    out.set(
      messageId,
      [...byEmoji.entries()].map(([emoji, v]) => ({ emoji, ...v })),
    );
  }
  return out;
}
