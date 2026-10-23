import { describe, expect, it } from 'vitest';
import { groupReactions, resolveReplyPreview } from '@/lib/chatThread';

describe('resolveReplyPreview', () => {
  const msgs = [
    { id: 'a', content: 'ciao', senderName: 'Ada' },
    { id: 'b', content: '', senderName: 'Bob' },
  ];

  it('returns undefined without reply id', () => {
    expect(resolveReplyPreview(msgs, null)).toBeUndefined();
  });

  it('uses parent text when the message is in the loaded window', () => {
    expect(resolveReplyPreview(msgs, 'a')).toEqual({ senderName: 'Ada', content: 'ciao' });
  });

  it('falls back when the parent is outside the window or has no text', () => {
    expect(resolveReplyPreview(msgs, 'missing')).toEqual({ senderName: '', content: 'Messaggio' });
    expect(resolveReplyPreview(msgs, 'b')).toEqual({ senderName: 'Bob', content: 'Allegato' });
  });
});

describe('groupReactions', () => {
  it('counts per emoji and marks mine', () => {
    const map = groupReactions(
      [
        { message_id: 'm1', user_id: 'me', emoji: '👍' },
        { message_id: 'm1', user_id: 'you', emoji: '👍' },
        { message_id: 'm1', user_id: 'you', emoji: '🔥' },
      ],
      'me',
    );
    expect(map.get('m1')).toEqual([
      { emoji: '👍', count: 2, mine: true },
      { emoji: '🔥', count: 1, mine: false },
    ]);
  });
});
