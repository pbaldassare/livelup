import { getOrCreateChat, sendMessage } from '@/lib/api/messages';
import { uploadChatAttachment } from '@/lib/api/chatAttachments';

export async function broadcastMessageToAthletes(params: {
  ptUserId: string;
  athleteUserIds: string[];
  content: string;
  file?: File | null;
}): Promise<number> {
  const { ptUserId, athleteUserIds, content, file } = params;
  let attachmentUrl: string | undefined;
  let attachmentType: string | undefined;
  if (file) {
    const uploaded = await uploadChatAttachment(file, ptUserId, `broadcast-${Date.now()}`);
    attachmentUrl = uploaded.url;
    attachmentType = uploaded.type;
  }
  let sent = 0;
  for (const athleteId of athleteUserIds) {
    const chat = await getOrCreateChat(ptUserId, athleteId);
    await sendMessage({
      chatId: chat.id,
      senderUserId: ptUserId,
      content,
      attachmentUrl,
      attachmentType,
    });
    sent++;
  }
  return sent;
}