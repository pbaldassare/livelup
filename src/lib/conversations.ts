export type ConversationRelation = 'active' | 'pending' | 'inquiry';

export function mergeConversationPeers(
  connections: Array<{ peerId: string; status: string }>,
  chatPeerIds: string[],
): Array<{ peerId: string; relation: ConversationRelation }> {
  const byId = new Map<string, ConversationRelation>();

  for (const connection of connections) {
    const peerId = connection.peerId?.trim();
    if (!peerId) continue;
    const status = (connection.status || '').toLowerCase();
    if (status === 'active') {
      byId.set(peerId, 'active');
    } else if (status === 'pending' && byId.get(peerId) !== 'active') {
      byId.set(peerId, 'pending');
    }
  }

  for (const peerId of chatPeerIds) {
    const id = peerId?.trim();
    if (!id || byId.has(id)) continue;
    byId.set(id, 'inquiry');
  }

  return [...byId.entries()].map(([peerId, relation]) => ({ peerId, relation }));
}

// Le righe elenco senza riga `chats` hanno un id segnaposto (non uuid):
// non vanno usate per leggere/inviare messaggi, la chat va prima creata.
export function findPersistedConversation<T extends { recipientUserId: string; _hasChat: boolean }>(
  rows: T[] | undefined,
  recipientId: string | undefined,
): T | undefined {
  if (!recipientId) return undefined;
  return rows?.find((row) => row.recipientUserId === recipientId && row._hasChat);
}

export function conversationFallbackPreview(relation: ConversationRelation): string {
  if (relation === 'pending') return 'Richiesta in attesa · puoi chattare';
  if (relation === 'inquiry') return 'Domanda · non ancora collegati';
  return 'Nessuna conversazione';
}

export function conversationRelationLabel(relation: ConversationRelation): string | null {
  if (relation === 'pending') return 'Richiesta';
  if (relation === 'inquiry') return 'Domanda';
  return null;
}
