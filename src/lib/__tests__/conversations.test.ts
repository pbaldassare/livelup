import { describe, expect, it } from 'vitest';
import {
  conversationFallbackPreview,
  conversationRelationLabel,
  findPersistedConversation,
  mergeConversationPeers,
} from '@/lib/conversations';

describe('mergeConversationPeers', () => {
  it('keeps active and pending connections even without a chat', () => {
    expect(
      mergeConversationPeers(
        [
          { peerId: 'pt-a', status: 'active' },
          { peerId: 'pt-b', status: 'pending' },
        ],
        [],
      ),
    ).toEqual([
      { peerId: 'pt-a', relation: 'active' },
      { peerId: 'pt-b', relation: 'pending' },
    ]);
  });

  it('marks existing chats without a connection as inquiry', () => {
    expect(
      mergeConversationPeers(
        [{ peerId: 'pt-a', status: 'active' }],
        ['pt-a', 'pt-c'],
      ),
    ).toEqual([
      { peerId: 'pt-a', relation: 'active' },
      { peerId: 'pt-c', relation: 'inquiry' },
    ]);
  });

  it('prefers active over pending for the same peer', () => {
    expect(
      mergeConversationPeers(
        [
          { peerId: 'pt-a', status: 'pending' },
          { peerId: 'pt-a', status: 'active' },
        ],
        ['pt-a'],
      ),
    ).toEqual([{ peerId: 'pt-a', relation: 'active' }]);
  });

  it('ignores terminated connections and blank ids', () => {
    expect(
      mergeConversationPeers(
        [
          { peerId: 'pt-old', status: 'terminated' },
          { peerId: '  ', status: 'active' },
        ],
        ['pt-new', ''],
      ),
    ).toEqual([{ peerId: 'pt-new', relation: 'inquiry' }]);
  });
});

describe('findPersistedConversation', () => {
  const rows = [
    { id: 'pending-pt-a', recipientUserId: 'pt-a', _hasChat: false },
    { id: 'chat-b', recipientUserId: 'pt-b', _hasChat: true },
  ];

  it('ignores connection placeholders without a chat row', () => {
    expect(findPersistedConversation(rows, 'pt-a')).toBeUndefined();
  });

  it('returns the real chat for the recipient', () => {
    expect(findPersistedConversation(rows, 'pt-b')?.id).toBe('chat-b');
  });

  it('handles missing list or recipient', () => {
    expect(findPersistedConversation(undefined, 'pt-b')).toBeUndefined();
    expect(findPersistedConversation(rows, undefined)).toBeUndefined();
  });
});

describe('conversation copy', () => {
  it('uses Italian fallbacks for pending and inquiry threads', () => {
    expect(conversationFallbackPreview('pending')).toContain('attesa');
    expect(conversationFallbackPreview('inquiry')).toContain('Domanda');
    expect(conversationRelationLabel('inquiry')).toBe('Domanda');
    expect(conversationRelationLabel('active')).toBeNull();
  });
});
